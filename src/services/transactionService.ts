import apiClient from '@/lib/axios';
import { mapTransaction, type TxnRow } from '@/lib/mappers';

/**
 * Transaction Service — backed by FastAPI
 *  - GET    /api/transactions
 *  - POST   /api/transactions
 *  - PUT    /api/transactions/{id}
 *  - DELETE /api/transactions/{id}
 *  - POST   /api/transactions/import
 */

export interface TransactionCreateRequest {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category?: string;
  payment_method?: string;
  notes?: string;
}

const LIMIT = 500;

class TransactionService {
  async getTransactions(): Promise<TxnRow[]> {
    const response = await apiClient.get('/api/transactions', { params: { page: 1, limit: LIMIT, sort_by: 'date', sort_order: 'desc' } });
    const rows: unknown[] = Array.isArray(response.data) ? response.data : [];
    return rows.map((r) => mapTransaction(r as Parameters<typeof mapTransaction>[0]));
  }

  async createTransaction(data: TransactionCreateRequest): Promise<TxnRow> {
    const response = await apiClient.post('/api/transactions', data);
    return mapTransaction(response.data);
  }

  async updateTransaction(id: string, data: Partial<TransactionCreateRequest>): Promise<TxnRow> {
    const response = await apiClient.put(`/api/transactions/${id}`, data);
    return mapTransaction(response.data);
  }

  async deleteTransaction(id: string): Promise<void> {
    await apiClient.delete(`/api/transactions/${id}`);
  }
}

export default new TransactionService();
