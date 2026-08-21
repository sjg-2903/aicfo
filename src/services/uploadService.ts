import apiClient from '@/lib/axios';
import type { EntityKey } from '@/lib/entityConfig';

/**
 * Upload Service — file imports and document extraction.
 *  - POST /api/{entity}/import            — CSV/Excel import
 *  - POST /api/uploads/extract            — image/PDF extraction (review first)
 *  - POST /api/uploads/extracted/confirm  — insert user-confirmed rows
 */

export interface ImportResult {
  import_type: string;
  total_rows: number;
  successful_rows: number;
  failed_rows: number;
  duplicates: number;
  errors: { row: number | null; field: string | null; message: string }[];
}

export interface ExtractionResult {
  file_name: string;
  import_type: string;
  method: 'gemini' | 'tesseract' | 'heuristics' | 'manual';
  confidence: 'high' | 'medium' | 'low';
  rows: Record<string, string>[];
  raw_text: string;
  row_count: number;
  note: string;
}

class UploadService {
  async importFile(
    entity: EntityKey,
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/api/${entity}/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 180000,
      onUploadProgress: (e) => {
        if (e.total && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    });
    return response.data as ImportResult;
  }

  async extractDocument(
    entity: EntityKey,
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<ExtractionResult> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/api/uploads/extract?import_type=${entity}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 180000,
      onUploadProgress: (e) => {
        if (e.total && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    });
    return response.data as ExtractionResult;
  }

  async confirmExtracted(payload: {
    import_type: EntityKey;
    file_name: string;
    rows: Record<string, unknown>[];
  }): Promise<ImportResult> {
    const response = await apiClient.post('/api/uploads/extracted/confirm', payload, {
      timeout: 120000,
    });
    return response.data as ImportResult;
  }
}

export default new UploadService();
