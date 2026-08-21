import apiClient from '@/lib/axios';
import { mapLoan, type LoanRow } from '@/lib/mappers';

/**
 * Loan Service — backed by FastAPI
 *  - GET    /api/loans
 *  - POST   /api/loans
 *  - PUT    /api/loans/{id}
 *  - PUT    /api/loans/{id}/mark-emi-paid
 *  - DELETE /api/loans/{id}
 */

export interface LoanCreateRequest {
  lender: string;
  loan_type?: string;
  principal_amount: number;
  outstanding_amount: number;
  interest_rate: number;
  emi_amount: number;
  start_date: string;
  end_date: string;
  next_emi_date?: string | null;
  status?: 'active' | 'closed' | 'defaulted';
}

const LIMIT = 500;

class LoanService {
  async getLoans(): Promise<LoanRow[]> {
    const response = await apiClient.get('/api/loans', { params: { page: 1, limit: LIMIT, sort_by: 'start_date', sort_order: 'desc' } });
    const rows: unknown[] = Array.isArray(response.data) ? response.data : [];
    return rows.map((r) => mapLoan(r as Parameters<typeof mapLoan>[0]));
  }

  async createLoan(data: LoanCreateRequest): Promise<LoanRow> {
    const response = await apiClient.post('/api/loans', data);
    return mapLoan(response.data);
  }

  async updateLoan(id: string, data: Partial<LoanCreateRequest>): Promise<LoanRow> {
    const response = await apiClient.put(`/api/loans/${id}`, data);
    return mapLoan(response.data);
  }

  async deleteLoan(id: string): Promise<void> {
    await apiClient.delete(`/api/loans/${id}`);
  }

  async markEMIPaid(id: string): Promise<LoanRow> {
    const response = await apiClient.put(`/api/loans/${id}/mark-emi-paid`);
    return mapLoan(response.data);
  }
}

export default new LoanService();
