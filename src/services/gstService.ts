import apiClient from '@/lib/axios';
import { mapGst, type GstRow } from '@/lib/mappers';

/**
 * GST & Tax Service — backed by FastAPI
 *  - GET /api/gst
 *  - PUT /api/gst/{id}/mark-filed
 */

const LIMIT = 500;

class GSTService {
  async getGSTRecords(): Promise<GstRow[]> {
    const response = await apiClient.get('/api/gst', { params: { page: 1, limit: LIMIT, sort_by: 'due_date', sort_order: 'desc' } });
    const rows: unknown[] = Array.isArray(response.data) ? response.data : [];
    return rows.map((r) => mapGst(r as Parameters<typeof mapGst>[0]));
  }

  async markAsFiled(id: string): Promise<GstRow> {
    const response = await apiClient.put(`/api/gst/${id}/mark-filed`);
    return mapGst(response.data);
  }
}

export default new GSTService();
