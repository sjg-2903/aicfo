import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  FileSpreadsheet,
  Image as ImageIcon,
  Loader2,
  ScanLine,
  Trash2,
  UploadCloud,
  XCircle,
  AlertTriangle,
  Plus,
  X,
  FileCheck2,
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { getErrorMessage } from '@/lib/axios';
import uploadService, { type ExtractionResult, type ImportResult } from '@/services/uploadService';
import { ENTITY_CONFIGS, fileKind, type EntityKey } from '@/lib/entityConfig';
import { cn } from '@/utils/cn';

type Step = 'select' | 'processing' | 'review' | 'done';

interface UploadFileItem {
  id: string;
  file: File;
  kind: 'tabular' | 'document';
  status: 'queued' | 'uploading' | 'processing' | 'success' | 'extracted' | 'error';
  progress: number;
  importResult?: ImportResult;
  extraction?: ExtractionResult;
  error?: string;
}

export interface UploadWizardProps {
  entity: EntityKey;
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

let uid = 0;
const nextId = () => `f${Date.now()}-${++uid}`;

export default function UploadWizard({ entity, open, onClose, onComplete }: UploadWizardProps) {
  const config = ENTITY_CONFIGS[entity];
  const { addToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('select');
  const [files, setFiles] = useState<UploadFileItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [reviewRows, setReviewRows] = useState<Record<string, string>[]>([]);
  const [reviewNotes, setReviewNotes] = useState<{ file: string; note: string }[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [confirmResult, setConfirmResult] = useState<ImportResult | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<number, string[]>>({});

  useEffect(() => {
    if (open) {
      setStep('select');
      setFiles([]);
      setReviewRows([]);
      setReviewNotes([]);
      setConfirmResult(null);
      setRowErrors({});
      setDragOver(false);
    }
  }, [open, entity]);

  const addFiles = (list: FileList | File[]) => {
    const incoming = Array.from(list);
    const items: UploadFileItem[] = incoming.map((file) => {
      const kind = fileKind(file.name);
      return {
        id: nextId(),
        file,
        kind: kind === 'unsupported' ? 'tabular' : kind,
        status: kind === 'unsupported' ? 'error' : 'queued',
        progress: 0,
        error:
          kind === 'unsupported'
            ? `"${file.name.split('.').pop()}" files are not supported. Use CSV, Excel, PDF, PNG or JPG.`
            : undefined,
      };
    });
    setFiles((prev) => [...prev, ...items]);
  };

  const setFileState = (id: string, patch: Partial<UploadFileItem>) =>
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const processAll = async () => {
    const queued = files.filter((f) => f.status === 'queued');
    if (queued.length === 0) return;
    setStep('processing');
    const extracted: { file: string; extraction: ExtractionResult }[] = [];

    for (const item of queued) {
      setFileState(item.id, { status: 'uploading' });
      try {
        if (item.kind === 'tabular') {
          const result = await uploadService.importFile(entity, item.file, (p) => setFileState(item.id, { progress: p }));
          setFileState(item.id, { status: 'success', importResult: result, progress: 100 });
        } else {
          const result = await uploadService.extractDocument(entity, item.file, (p) => setFileState(item.id, { progress: p }));
          setFileState(item.id, { status: 'extracted', extraction: result, progress: 100 });
          extracted.push({ file: item.file.name, extraction: result });
        }
      } catch (e) {
        setFileState(item.id, { status: 'error', error: getErrorMessage(e) });
      }
    }

    const allRows = extracted.flatMap(({ file, extraction }) =>
      (extraction.rows || []).map((row) => ({ ...row, _source: file }))
    );
    if (extracted.length > 0) {
      setReviewRows(allRows.length > 0 ? allRows : [{}]);
      setReviewNotes(extracted.map(({ file, extraction }) => ({ file, note: extraction.note || '' })));
      setStep('review');
      return;
    }
    setStep('done');
  };

  const totals = useMemo(() => {
    const tabular = files.filter((f) => f.kind === 'tabular' && f.status === 'success');
    const failed = files.filter((f) => f.status === 'error');
    const extracted = files.filter((f) => f.kind === 'document' && f.status === 'extracted');
    const importedRows = tabular.reduce((s, f) => s + (f.importResult?.successful_rows || 0), 0);
    const duplicates = tabular.reduce((s, f) => s + (f.importResult?.duplicates || 0), 0);
    const failedRows = tabular.reduce((s, f) => s + (f.importResult?.failed_rows || 0), 0);
    return { importedFiles: tabular.length, extractedFiles: extracted.length, failedFiles: failed.length, importedRows, duplicates, failedRows };
  }, [files]);

  const allErrors = useMemo(() => {
    const list: { file: string; message: string }[] = [];
    for (const f of files) {
      if (f.status === 'error' && f.error) list.push({ file: f.file.name, message: f.error });
      for (const e of f.importResult?.errors || []) {
        list.push({ file: f.file.name, message: `Row ${e.row ?? '—'}: ${e.message}` });
      }
    }
    for (const e of confirmResult?.errors || []) {
      list.push({ file: 'Confirmed data', message: `Row ${e.row ?? '—'}: ${e.message}` });
    }
    return list;
  }, [files, confirmResult]);

  const validateRows = (rows: Record<string, string>[]): Record<number, string[]> => {
    const errors: Record<number, string[]> = {};
    rows.forEach((row, idx) => {
      const hasAny = Object.values(row).some((v) => String(v ?? '').trim() !== '');
      if (!hasAny) return;
      const rowIssues: string[] = [];
      for (const field of config.fields) {
        const value = String(row[field.key] ?? '').trim();
        if (field.required && !value) rowIssues.push(`"${field.label}" is required`);
        if (field.type === 'number' && value && Number.isNaN(Number(value))) rowIssues.push(`"${field.label}" must be a number`);
      }
      if (rowIssues.length) errors[idx] = rowIssues;
    });
    return errors;
  };

  const updateRow = (idx: number, key: string, value: string) =>
    setReviewRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));

  const removeRow = (idx: number) => {
    setReviewRows((prev) => prev.filter((_, i) => i !== idx));
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  };

  const addEmptyRow = () => setReviewRows((prev) => [...prev, {}]);

  const confirmReview = async () => {
    const errors = validateRows(reviewRows);
    setRowErrors(errors);
    if (Object.keys(errors).length > 0) return;
    const rows = reviewRows
      .map((r) => {
        const cleaned: Record<string, unknown> = {};
        for (const k of Object.keys(r)) {
          if (k === '_source') continue;
          const v = String(r[k] ?? '').trim();
          if (v !== '') cleaned[k] = v;
        }
        return cleaned;
      })
      .filter((r) => Object.keys(r).length > 0);
    if (rows.length === 0) {
      setStep('done');
      return;
    }
    setConfirming(true);
    try {
      const result = await uploadService.confirmExtracted({
        import_type: entity,
        file_name: reviewNotes.map((n) => n.file).join(', ') || 'extracted document',
        rows,
      });
      setConfirmResult(result);
      setStep('done');
      if (result.failed_rows === 0) addToast(`${result.successful_rows} record(s) saved to ${config.label}`, 'success');
      else addToast(`Saved with issues — ${result.successful_rows} saved, ${result.failed_rows} failed`, 'warning');
    } catch (e) {
      addToast(getErrorMessage(e), 'error');
    } finally {
      setConfirming(false);
    }
  };

  const finish = () => {
    onComplete();
    onClose();
  };

  const downloadTemplate = () => {
    const headers = config.fields.map((f) => f.key).join(',');
    const blob = new Blob([headers + '\n'], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entity}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const acceptedExtensions = ['csv', 'xlsx', 'pdf', 'png', 'jpg', 'jpeg', 'webp'];

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={`Upload ${config.label}`}
      size="xl"
      className="max-w-4xl"
    >
      <div className="space-y-5">
        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs font-medium">
          {(['select', 'processing', 'review', 'done'] as Step[]).map((s, idx) => {
            const active = step === s;
            const passed = ['select', 'processing', 'review', 'done'].indexOf(step) > idx;
            return (
              <React.Fragment key={s}>
                {idx > 0 && <div className={cn('h-px flex-1', passed || active ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700')} />}
                <div
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-full transition',
                    active ? 'bg-blue-600 text-white' : passed ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                  )}
                >
                  {s === 'select' && <UploadCloud className="w-3.5 h-3.5" />}
                  {s === 'processing' && <Loader2 className="w-3.5 h-3.5" />}
                  {s === 'review' && <ScanLine className="w-3.5 h-3.5" />}
                  {s === 'done' && <FileCheck2 className="w-3.5 h-3.5" />}
                  {s === 'select' ? 'Files' : s === 'processing' ? 'Processing' : s === 'review' ? 'Review' : 'Summary'}
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* ── Step 1: select files ─────────────────────────────────────── */}
        {step === 'select' && (
          <>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
              }}
              onClick={() => inputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200',
                dragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 scale-[1.01]' : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              )}
            >
              <UploadCloud className={cn('w-10 h-10 mx-auto mb-3 transition-colors', dragOver ? 'text-blue-600' : 'text-slate-300 dark:text-slate-600')} />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Drag &amp; drop files here, or <span className="text-blue-600 dark:text-blue-400 font-semibold">browse</span>
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                CSV / Excel for direct import · PDF / PNG / JPG for AI document extraction
              </p>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept={acceptedExtensions.map((e) => `.${e}`).join(',')}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) addFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                    {f.kind === 'tabular' ? (
                      <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{f.file.name}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {f.kind === 'tabular' ? 'Structured file — imported directly' : 'Document — AI extraction with review'}
                        {' · '}
                        {(f.file.size / 1024).toFixed(1)} KB
                      </p>
                      {f.error && <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{f.error}</p>}
                    </div>
                    <button
                      onClick={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                      aria-label="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="text-xs text-slate-400 dark:text-slate-500">
                Expected columns: <span className="font-mono text-slate-500 dark:text-slate-400">{config.csvHint}</span>
                <button onClick={downloadTemplate} className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium cursor-pointer">
                  Download template
                </button>
              </div>
              <button
                onClick={processAll}
                disabled={!files.some((f) => f.status === 'queued')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-lg text-sm font-medium transition shadow-sm cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                {files.some((f) => f.status === 'queued') ? `Upload ${files.filter((f) => f.status === 'queued').length} file(s)` : 'Upload'}
              </button>
            </div>
          </>
        )}

        {/* ── Step 2: processing ───────────────────────────────────────── */}
        {step === 'processing' && (
          <div className="space-y-3">
            {files.map((f) => (
              <div key={f.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80">
                <div className="flex items-center gap-3">
                  {f.kind === 'tabular' ? (
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-violet-600 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{f.file.name}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-300',
                            f.status === 'error' ? 'bg-red-500' : f.status === 'success' || f.status === 'extracted' ? 'bg-green-500' : 'bg-blue-500'
                          )}
                          style={{ width: `${f.status === 'error' ? 100 : f.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400 dark:text-slate-500 w-10 text-right">
                        {f.status === 'success' || f.status === 'extracted' ? '100%' : `${f.progress}%`}
                      </span>
                    </div>
                  </div>
                  {f.status === 'uploading' && <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" />}
                  {f.status === 'success' && <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />}
                  {f.status === 'extracted' && <ScanLine className="w-5 h-5 text-violet-500 shrink-0" />}
                  {f.status === 'error' && <XCircle className="w-5 h-5 text-red-500 shrink-0" />}
                </div>
                {f.status === 'success' && f.importResult && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    {f.importResult.successful_rows} saved · {f.importResult.duplicates} duplicate(s) skipped ·{' '}
                    {f.importResult.failed_rows} invalid row(s)
                  </p>
                )}
                {f.status === 'extracted' && f.extraction && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    {f.extraction.row_count} record(s) detected — pending your review
                  </p>
                )}
                {f.status === 'error' && f.error && <p className="text-xs text-red-600 dark:text-red-400 mt-2">{f.error}</p>}
              </div>
            ))}
          </div>
        )}

        {/* ── Step 3: review extracted data ────────────────────────────── */}
        {step === 'review' && (
          <>
            <div className="space-y-2">
              {reviewNotes.map((n, i) => (
                <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900/40 text-xs text-violet-700 dark:text-violet-300">
                  <ScanLine className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>
                    <span className="font-semibold">{n.file}:</span> {n.note}
                  </p>
                </div>
              ))}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 text-xs text-amber-700 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  Review, correct or remove the extracted rows below. <span className="font-semibold">Nothing is saved until you confirm.</span>
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                      {config.fields.map((f) => (
                        <th key={f.key} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {f.label}
                          {f.required && <span className="text-red-500">*</span>}
                        </th>
                      ))}
                      <th className="px-3 py-2.5 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {reviewRows.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-100 dark:border-slate-800/80 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                        {config.fields.map((f) => {
                          const value = row[f.key] ?? '';
                          const hasError = rowErrors[idx]?.some((e) => e.includes(f.label)) || false;
                          return (
                            <td key={f.key} className="px-2 py-1.5 align-top">
                              {f.type === 'boolean' ? (
                                <div className="flex items-center justify-center pt-2">
                                  <input
                                    type="checkbox"
                                    checked={value === 'true' || value === '1' || value === 'yes'}
                                    onChange={(e) => updateRow(idx, f.key, e.target.checked ? 'true' : '')}
                                    className="w-4 h-4 accent-blue-600"
                                  />
                                </div>
                              ) : (
                                <input
                                  type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                                  step="any"
                                  value={value}
                                  placeholder={f.placeholder || ''}
                                  onChange={(e) => updateRow(idx, f.key, e.target.value)}
                                  className={cn(
                                    'w-full min-w-[110px] px-2 py-1.5 border rounded-lg text-xs outline-none transition',
                                    hasError
                                      ? 'border-red-400 focus:border-red-500 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200'
                                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30'
                                  )}
                                />
                              )}
                            </td>
                          );
                        })}
                        <td className="px-2 py-1.5">
                          <button
                            onClick={() => removeRow(idx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                            aria-label="Remove row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {Object.keys(rowErrors).length > 0 && (
              <p className="text-xs text-red-600 dark:text-red-400">
                Please fix the highlighted fields — required values are missing or numbers are invalid.
              </p>
            )}

            <div className="flex items-center justify-between gap-2">
              <button
                onClick={addEmptyRow}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add row
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setStep('done')}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                >
                  Discard extracted data
                </button>
                <button
                  onClick={confirmReview}
                  disabled={confirming}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-lg text-sm font-medium transition shadow-sm cursor-pointer"
                >
                  {confirming ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Confirm &amp; save {reviewRows.length} row(s)
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Step 4: summary ──────────────────────────────────────────── */}
        {step === 'done' && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SummaryStat label="Files imported" value={totals.importedFiles} tone="green" />
              <SummaryStat label="Records saved" value={totals.importedRows + (confirmResult?.successful_rows || 0)} tone="blue" />
              <SummaryStat label="Duplicates skipped" value={totals.duplicates + (confirmResult?.duplicates || 0)} tone="slate" />
              <SummaryStat label="Files failed" value={totals.failedFiles} tone="red" />
            </div>

            {files.filter((f) => f.status === 'success' || f.status === 'extracted' || f.status === 'error').map((f) => (
              <div key={f.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                {f.status === 'error' ? (
                  <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                ) : f.status === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                ) : (
                  <ScanLine className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{f.file.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {f.status === 'success' && f.importResult && (
                      <>
                        {f.importResult.successful_rows} saved · {f.importResult.duplicates} duplicate(s) · {f.importResult.failed_rows} invalid
                      </>
                    )}
                    {f.status === 'extracted' && `${f.extraction?.row_count || 0} record(s) extracted for review`}
                    {f.status === 'error' && <span className="text-red-600 dark:text-red-400">{f.error}</span>}
                  </p>
                </div>
              </div>
            ))}

            {confirmResult && (
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-900/40 text-sm text-green-800 dark:text-green-200">
                <p className="font-medium">
                  <CheckCircle2 className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                  Confirmed data saved
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  {confirmResult.successful_rows} saved · {confirmResult.duplicates} duplicate(s) skipped · {confirmResult.failed_rows} invalid
                </p>
              </div>
            )}

            {allErrors.length > 0 && (
              <details className="rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40">
                <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-amber-800 dark:text-amber-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> View validation details ({allErrors.length})
                </summary>
                <ul className="px-4 pb-3 space-y-1 max-h-44 overflow-y-auto">
                  {allErrors.map((e, i) => (
                    <li key={i} className="text-xs text-amber-800 dark:text-amber-300">
                      <span className="font-medium">{e.file}:</span> {e.message}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={finish}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm cursor-pointer"
              >
                Done — view {config.label.toLowerCase()}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: number; tone: 'green' | 'red' | 'blue' | 'slate' }) {
  const color = tone === 'green' ? 'text-green-600 dark:text-green-400' : tone === 'red' ? 'text-red-600 dark:text-red-400' : tone === 'blue' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300';
  return (
    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-transparent dark:border-slate-700/60 text-center">
      <p className={cn('text-xl font-bold', color)}>{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}
