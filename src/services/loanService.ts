import apiClient from '@/lib/axios';
import { mapLoan, type LoanRow } from '@/lib/mappers';

/**
 * Loan Service — backed by FastAPI
 *  - GET /api/loans
 *  - PUT /api/loans/{id}/mark-emi-paid
 */

const LIMIT = 500;

class LoanService {
  async getLoans(): Promise<LoanRow[]> {
    const response = await apiClient.get('/api/loans', { params: { page: 1, limit: LIMIT, sort_by: 'start_date', sort_order: 'desc' } });
    const rows: unknown[] = Array.isArray(response.data) ? response.data : [];
    return rows.map((r) => mapLoan(r as Parameters<typeof mapLoan>[0]));
  }

  async markEMIPaid(id: string): Promise<LoanRow> {
    const response = await apiClient.put(`/api/loans/${id}/mark-emi-paid`);
    return mapLoan(response.data);
  }
}

export default new LoanService();
