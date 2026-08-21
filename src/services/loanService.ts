import apiClient from '@/lib/axios';

/**
 * Loan Service
 * 
 * API Documentation:
 * - GET /api/loans - Get loans with pagination, filtering, sorting
 * - GET /api/loans/{id} - Get loan details
 * - POST /api/loans - Create new loan record
 * - PUT /api/loans/{id} - Update loan record
 * - DELETE /api/loans/{id} - Delete loan record
 * - GET /api/loans/{id}/emi-schedule - Get EMI payment schedule
 * - PUT /api/loans/{id}/mark-emi-paid - Mark EMI as paid
 */

export type LoanStatus = 'active' | 'closed' | 'defaulted';

export interface Loan {
  id: string;
  lender: string;
  loan_type: string;
  principal_amount: number;
  outstanding_amount: number;
  interest_rate: number;
  emi_amount: number;
  start_date: string;
  end_date: string;
  next_emi_date?: string;
  status: LoanStatus;
  total_emi_paid: number;
  total_emi_count: number;
  remaining_emi_count: number;
  created_at: string;
  updated_at: string;
}

export interface LoanListResponse {
  data: Loan[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface LoanFilter {
  status?: LoanStatus;
  lender?: string;
}

export interface LoanCreateRequest {
  lender: string;
  loan_type: string;
  principal_amount: number;
  interest_rate: number;
  emi_amount: number;
  start_date: string;
  end_date: string;
}

export interface LoanUpdateRequest extends Partial<LoanCreateRequest> {}

export interface EMISchedule {
  emi_number: number;
  due_date: string;
  principal: number;
  interest: number;
  emi_amount: number;
  outstanding_balance: number;
  status: 'pending' | 'paid' | 'overdue';
  paid_date?: string;
}

class LoanService {
  async getLoans(
    page: number = 1,
    page_size: number = 20,
    filters?: LoanFilter,
    sort_by: string = 'start_date',
    sort_order: 'asc' | 'desc' = 'desc'
  ): Promise<LoanListResponse> {
    const response = await apiClient.get('/api/loans', {
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

  async getLoan(id: string): Promise<Loan> {
    const response = await apiClient.get(`/api/loans/${id}`);
    return response.data;
  }

  async createLoan(data: LoanCreateRequest): Promise<Loan> {
    const response = await apiClient.post('/api/loans', data);
    return response.data;
  }

  async updateLoan(id: string, data: LoanUpdateRequest): Promise<Loan> {
    const response = await apiClient.put(`/api/loans/${id}`, data);
    return response.data;
  }

  async deleteLoan(id: string): Promise<void> {
    await apiClient.delete(`/api/loans/${id}`);
  }

  async getEMISchedule(id: string): Promise<EMISchedule[]> {
    const response = await apiClient.get(`/api/loans/${id}/emi-schedule`);
    return response.data;
  }

  async markEMIPaid(id: string, emi_number: number): Promise<Loan> {
    const response = await apiClient.put(`/api/loans/${id}/mark-emi-paid`, {
      emi_number,
    });
    return response.data;
  }
}

export default new LoanService();
