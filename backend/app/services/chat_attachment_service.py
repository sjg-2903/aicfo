"""Safe, bounded file preparation for AI CFO chat attachments.

Chat accepts any non-empty file up to 15 MB. Known office, data, document, text
and image formats receive richer extraction; every other binary format gets a
safe metadata summary. Files are never executed or imported into the business
ledgers. Images retain their bytes only in memory for provider image understanding
within the active chat request; this module never generates images.
"""

from __future__ import annotations

import io
import json
import re
import zipfile
from pathlib import Path
from typing import Any

import pandas as pd

from app.core.errors import BadRequestError

MAX_CHAT_FILE_BYTES = 15 * 1024 * 1024
MAX_ATTACHMENT_CONTEXT_CHARS = 50_000
MAX_TABLE_PREVIEW_ROWS = 100
MAX_PDF_PAGES = 40

_TEXT_EXTENSIONS = {
    ".txt", ".md", ".log", ".py", ".js", ".jsx", ".ts", ".tsx", ".css",
    ".html", ".xml", ".yaml", ".yml", ".sql", ".rtf",
}
_IMAGE_MIME = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
    ".tif": "image/tiff",
    ".tiff": "image/tiff",
}
def _bounded(text: str) -> str:
    text = text.replace("\x00", "").strip()
    if len(text) <= MAX_ATTACHMENT_CONTEXT_CHARS:
        return text
    return text[:MAX_ATTACHMENT_CONTEXT_CHARS] + "\n\n[File context truncated safely]"


def _decode_text(content: bytes) -> str:
    # Only try UTF-16 when a byte-order mark identifies it; otherwise arbitrary
    # binary pairs often decode into printable Unicode and look like fake text.
    if content.startswith((b"\xff\xfe", b"\xfe\xff")):
        try:
            return content.decode("utf-16")
        except UnicodeDecodeError:
            pass
    try:
        return content.decode("utf-8-sig")
    except UnicodeDecodeError:
        return content.decode("latin-1")


def _table_context(frame: pd.DataFrame, file_name: str) -> tuple[str, str]:
    frame = frame.copy()
    frame.columns = [str(column) for column in frame.columns]
    rows, columns = frame.shape
    column_names = ", ".join(frame.columns[:40]) or "none"
    summary = f"{file_name}: {rows} row(s), {columns} column(s). Columns: {column_names}."

    parts = [summary]
    numeric = frame.select_dtypes(include="number")
    if not numeric.empty:
        numeric_lines = []
        for column in numeric.columns[:12]:
            series = numeric[column].dropna()
            if series.empty:
                continue
            numeric_lines.append(
                f"- {column}: count={len(series)}, sum={float(series.sum()):.2f}, "
                f"mean={float(series.mean()):.2f}, min={float(series.min()):.2f}, "
                f"max={float(series.max()):.2f}"
            )
        if numeric_lines:
            parts.append("Numeric summary:\n" + "\n".join(numeric_lines))

    preview = frame.head(MAX_TABLE_PREVIEW_ROWS).fillna("").to_csv(index=False)
    parts.append(f"First {min(rows, MAX_TABLE_PREVIEW_ROWS)} row(s) as CSV:\n{preview}")
    return _bounded("\n\n".join(parts)), summary


def _pdf_context(content: bytes, file_name: str) -> tuple[str, str]:
    try:
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(content))
        texts = []
        for page in reader.pages[:MAX_PDF_PAGES]:
            texts.append(page.extract_text() or "")
        text = "\n\n".join(texts).strip()
        summary = (
            f"{file_name}: PDF with {len(reader.pages)} page(s); "
            f"text extracted from up to {MAX_PDF_PAGES} page(s)."
        )
        if not text:
            summary += " No readable text layer was found."
        return _bounded(f"{summary}\n\n{text}"), summary
    except Exception as exc:
        raise BadRequestError(
            "The PDF could not be read. It may be damaged or password protected.",
            error_code="CHAT_FILE_INVALID",
        ) from exc


def _office_archive_context(content: bytes, file_name: str) -> tuple[str, str]:
    """Extract human-readable XML text from DOCX/PPTX/ODT or list a ZIP."""
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            names = archive.namelist()
            xml_names = [
                name
                for name in names
                if (
                    name == "word/document.xml"
                    or name.startswith("ppt/slides/slide")
                    or name == "content.xml"
                )
                and name.endswith(".xml")
            ]
            text_parts = []
            extracted_bytes = 0
            for name in xml_names[:200]:
                info = archive.getinfo(name)
                # Defend against highly compressed archive members. The final
                # model context is much smaller, so 2 MB of source XML is ample.
                remaining = 2 * 1024 * 1024 - extracted_bytes
                if remaining <= 0 or info.file_size > min(1024 * 1024, remaining):
                    continue
                xml_bytes = archive.read(name)
                extracted_bytes += len(xml_bytes)
                xml = xml_bytes.decode("utf-8", errors="replace")
                plain = re.sub(r"<[^>]+>", " ", xml)
                plain = re.sub(r"\s+", " ", plain).strip()
                if plain:
                    text_parts.append(plain)
            if text_parts:
                summary = f"{file_name}: office document with {len(text_parts)} readable part(s)."
                return _bounded(f"{summary}\n\n" + "\n\n".join(text_parts)), summary
            listing = "\n".join(names[:300])
            summary = f"{file_name}: archive with {len(names)} item(s); no document text was found."
            return _bounded(f"{summary}\n\nArchive contents:\n{listing}"), summary
    except Exception as exc:
        raise BadRequestError(
            "The office document or archive could not be read.",
            error_code="CHAT_FILE_INVALID",
        ) from exc


def _image_ocr(content: bytes) -> str:
    """Best-effort local OCR used by the deterministic chat fallback."""
    try:
        from PIL import Image
        import pytesseract

        with Image.open(io.BytesIO(content)) as image:
            return _bounded(pytesseract.image_to_string(image))
    except Exception:
        return ""


def prepare_attachment(content: bytes, file_name: str, content_type: str = "") -> dict[str, Any]:
    """Validate a chat upload and return bounded model context + metadata."""
    safe_name = Path(file_name or "attachment").name
    extension = Path(safe_name).suffix.lower()
    if not content:
        raise BadRequestError("The selected file is empty", error_code="CHAT_FILE_EMPTY")
    if len(content) > MAX_CHAT_FILE_BYTES:
        raise BadRequestError(
            "Chat attachments must be 15 MB or smaller",
            error_code="PAYLOAD_TOO_LARGE",
            status_code=413,
        )
    attachment: dict[str, Any] = {
        "name": safe_name,
        "size": len(content),
        "content_type": content_type or "application/octet-stream",
        "kind": "document",
        "summary": "",
        "context": "",
    }

    try:
        if extension in _IMAGE_MIME or content_type.lower().startswith("image/"):
            image_mime = _IMAGE_MIME.get(extension, content_type or "image/png")
            attachment.update(
                {
                    "kind": "image",
                    "content_type": image_mime,
                    "image_bytes": content,
                }
            )
            ocr = _image_ocr(content)
            summary = f"{safe_name}: image attachment ({image_mime})."
            if ocr:
                summary += " Text was also recognized locally for fallback analysis."
            attachment["summary"] = summary
            attachment["context"] = _bounded(f"{summary}\n\nRecognized text:\n{ocr}")
            return attachment

        if extension == ".pdf":
            context, summary = _pdf_context(content, safe_name)
        elif extension in {".csv", ".tsv"}:
            separator = "\t" if extension == ".tsv" else ","
            frame = pd.read_csv(io.BytesIO(content), sep=separator)
            context, summary = _table_context(frame, safe_name)
        elif extension in {".xlsx", ".xls"}:
            frame = pd.read_excel(io.BytesIO(content))
            context, summary = _table_context(frame, safe_name)
        elif extension == ".json":
            parsed = json.loads(_decode_text(content))
            pretty = json.dumps(parsed, indent=2, ensure_ascii=False, default=str)
            count = len(parsed) if isinstance(parsed, (list, dict)) else 1
            summary = f"{safe_name}: JSON attachment with {count} top-level item(s)."
            context = _bounded(f"{summary}\n\n{pretty}")
        elif extension in {".docx", ".pptx", ".odt", ".zip"}:
            context, summary = _office_archive_context(content, safe_name)
        else:
            # Accept every other file type safely. Text-like content is decoded;
            # opaque binary formats still reach chat as metadata rather than
            # being executed or rejected.
            text = _decode_text(content)
            sample = text[:4000]
            printable = sum(char.isprintable() or char in "\r\n\t" for char in sample)
            readable_ratio = printable / max(1, len(sample))
            if content_type.startswith("text/") or extension in _TEXT_EXTENSIONS or readable_ratio >= 0.85:
                lines = text.count("\n") + (1 if text else 0)
                summary = f"{safe_name}: text-like attachment with {lines} line(s)."
                context = _bounded(f"{summary}\n\n{text}")
            else:
                summary = (
                    f"{safe_name}: binary attachment ({content_type or 'unknown type'}, "
                    f"{len(content)} bytes). No safe text preview was available."
                )
                context = summary
    except BadRequestError:
        raise
    except Exception as exc:
        raise BadRequestError(
            "The selected file could not be read. Check its format and try again.",
            error_code="CHAT_FILE_INVALID",
        ) from exc

    attachment["summary"] = summary
    attachment["context"] = context
    return attachment


def stored_metadata(attachment: dict[str, Any]) -> dict[str, Any]:
    """Return attachment metadata safe for MongoDB (never store file bytes)."""
    return {
        "name": attachment.get("name", "attachment"),
        "size": int(attachment.get("size") or 0),
        "content_type": attachment.get("content_type", "application/octet-stream"),
        "kind": attachment.get("kind", "document"),
    }
