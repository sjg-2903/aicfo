import apiClient from '@/lib/axios';

/**
 * Transaction Service
 * 
 * API Documentation:
 * - GET /api/transactions - Get transactions with pagination, filtering, sorting
 * - GET /api/transactions/{id} - Get transaction details
 * - POST /api/transactions - Create new transaction
 * - PUT /api/transactions/{id} - Update transaction
 * - DELETE /api/transactions/{id} - Delete transaction
 * - POST /api/transactions/import - Import transactions from CSV
 */

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  payment_method: string;
  reference_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionListResponse {
  data: Transaction[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface TransactionFilter {
  type?: 'income' | 'expense';
  category?: string;
  start_date?: string;
  end_date?: string;
  payment_method?: string;
}

export interface TransactionCreateRequest {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  payment_method: string;
  reference_id?: string;
  notes?: string;
}

export interface TransactionUpdateRequest extends Partial<TransactionCreateRequest> {}

class TransactionService {
  async getTransactions(
    page: number = 1,
    page_size: number = 20,
    filters?: TransactionFilter,
    sort_by: string = 'date',
    sort_order: 'asc' | 'desc' = 'desc'
  ): Promise<TransactionListResponse> {
    const response = await apiClient.get('/api/transactions', {
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

  async getTransaction(id: string): Promise<Transaction> {
    const response = await apiClient.get(`/api/transactions/${id}`);
    return response.data;
  }

  async createTransaction(data: TransactionCreateRequest): Promise<Transaction> {
    const response = await apiClient.post('/api/transactions', data);
    return response.data;
  }

  async updateTransaction(id: string, data: TransactionUpdateRequest): Promise<Transaction> {
    const response = await apiClient.put(`/api/transactions/${id}`, data);
    return response.data;
  }

  async deleteTransaction(id: string): Promise<void> {
    await apiClient.delete(`/api/transactions/${id}`);
  }

  async importTransactions(file: File): Promise<{ imported_count: number }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/api/transactions/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
}

export default new TransactionService();
