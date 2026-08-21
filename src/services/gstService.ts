import apiClient from '@/lib/axios';
import { mapGst, type GstRow } from '@/lib/mappers';

/**
 * GST & Tax Service — backed by FastAPI
 *  - GET    /api/gst
 *  - POST   /api/gst
 *  - PUT    /api/gst/{id}
 *  - PUT    /api/gst/{id}/mark-filed
 *  - DELETE /api/gst/{id}
 */

export interface GstCreateRequest {
  period: string;
  period_start: string;
  period_end: string;
  due_date: string;
  taxable_turnover: number;
  tax_amount: number;
  paid_amount?: number;
  status?: 'pending' | 'filed' | 'paid' | 'overdue';
}

const LIMIT = 500;

class GSTService {
  async getGSTRecords(): Promise<GstRow[]> {
    const response = await apiClient.get('/api/gst', { params: { page: 1, limit: LIMIT, sort_by: 'due_date', sort_order: 'desc' } });
    const rows: unknown[] = Array.isArray(response.data) ? response.data : [];
    return rows.map((r) => mapGst(r as Parameters<typeof mapGst>[0]));
  }

  async createGSTRecord(data: GstCreateRequest): Promise<GstRow> {
    const response = await apiClient.post('/api/gst', data);
    return mapGst(response.data);
  }

  async updateGSTRecord(id: string, data: Partial<GstCreateRequest>): Promise<GstRow> {
    const response = await apiClient.put(`/api/gst/${id}`, data);
    return mapGst(response.data);
  }

  async deleteGSTRecord(id: string): Promise<void> {
    await apiClient.delete(`/api/gst/${id}`);
  }

  async markAsFiled(id: string): Promise<GstRow> {
    const response = await apiClient.put(`/api/gst/${id}/mark-filed`);
    return mapGst(response.data);
  }
}

export default new GSTService();
