import apiClient from '@/lib/axios';

/**
 * GST & Tax Service
 * 
 * API Documentation:
 * - GET /api/gst - Get GST records with pagination, filtering
 * - GET /api/gst/{id} - Get GST record details
 * - POST /api/gst - Create new GST record
 * - PUT /api/gst/{id} - Update GST record
 * - DELETE /api/gst/{id} - Delete GST record
 * - GET /api/gst/obligations/upcoming - Get upcoming GST obligations
 * - GET /api/gst/obligations/overdue - Get overdue GST obligations
 * - PUT /api/gst/{id}/mark-filed - Mark GST filing as completed
 */

export type TaxStatus = 'pending' | 'filed' | 'paid' | 'overdue';

export interface GSTRecord {
  id: string;
  period: string;
  period_start: string;
  period_end: string;
  taxable_turnover: number;
  tax_rate: number;
  tax_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  status: TaxStatus;
  due_date: string;
  filing_date?: string;
  payment_date?: string;
  reference_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface GSTListResponse {
  data: GSTRecord[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface GSTFilter {
  status?: TaxStatus;
  period?: string;
}

export interface GSTCreateRequest {
  period: string;
  period_start: string;
  period_end: string;
  taxable_turnover: number;
  tax_rate: number;
  tax_amount: number;
  due_date: string;
  notes?: string;
}

export interface GSTUpdateRequest extends Partial<GSTCreateRequest> {}

export interface GSTObligation {
  id: string;
  period: string;
  due_date: string;
  tax_amount: number;
  status: TaxStatus;
  days_until_due: number;
}

class GSTService {
  async getGSTRecords(
    page: number = 1,
    page_size: number = 20,
    filters?: GSTFilter,
    sort_by: string = 'period_end',
    sort_order: 'asc' | 'desc' = 'desc'
  ): Promise<GSTListResponse> {
    const response = await apiClient.get('/api/gst', {
      params: {
        page,
        page_size,
        ...filters,
        sort_by,
        sort_order,
      },
    });
    return response.data;
  }

  async getGSTRecord(id: string): Promise<GSTRecord> {
    const response = await apiClient.get(`/api/gst/${id}`);
    return response.data;
  }

  async createGSTRecord(data: GSTCreateRequest): Promise<GSTRecord> {
    const response = await apiClient.post('/api/gst', data);
    return response.data;
  }

  async updateGSTRecord(id: string, data: GSTUpdateRequest): Promise<GSTRecord> {
    const response = await apiClient.put(`/api/gst/${id}`, data);
    return response.data;
  }

  async deleteGSTRecord(id: string): Promise<void> {
    await apiClient.delete(`/api/gst/${id}`);
  }

  async getUpcomingObligations(): Promise<GSTObligation[]> {
    const response = await apiClient.get('/api/gst/obligations/upcoming');
    return response.data;
  }

  async getOverdueObligations(): Promise<GSTObligation[]> {
    const response = await apiClient.get('/api/gst/obligations/overdue');
    return response.data;
  }

  async markAsFiled(id: string): Promise<GSTRecord> {
    const response = await apiClient.put(`/api/gst/${id}/mark-filed`);
    return response.data;
  }
}

export default new GSTService();
