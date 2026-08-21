import apiClient from '@/lib/axios';
import { mapExpense, type ExpenseRow } from '@/lib/mappers';

/**
 * Expense Service — backed by FastAPI
 *  - GET  /api/expenses
 *  - POST /api/expenses
 *  - PUT  /api/expenses/{id}
 *  - DELETE /api/expenses/{id}
 */

export interface ExpenseCreateRequest {
  date: string;
  description: string;
  amount: number;
  category?: string;
  vendor?: string;
  payment_method?: string;
  recurring?: boolean;
}

const LIMIT = 500;

class ExpenseService {
  async getExpenses(): Promise<ExpenseRow[]> {
    const response = await apiClient.get('/api/expenses', { params: { page: 1, limit: LIMIT, sort_by: 'date', sort_order: 'desc' } });
    const rows: unknown[] = Array.isArray(response.data) ? response.data : [];
    return rows.map((r) => mapExpense(r as Parameters<typeof mapExpense>[0]));
  }

  async createExpense(data: ExpenseCreateRequest): Promise<ExpenseRow> {
    const response = await apiClient.post('/api/expenses', data);
    return mapExpense(response.data);
  }

  async updateExpense(id: string, data: Partial<ExpenseCreateRequest>): Promise<ExpenseRow> {
    const response = await apiClient.put(`/api/expenses/${id}`, data);
    return mapExpense(response.data);
  }

  async deleteExpense(id: string): Promise<void> {
    await apiClient.delete(`/api/expenses/${id}`);
  }
}

export default new ExpenseService();
