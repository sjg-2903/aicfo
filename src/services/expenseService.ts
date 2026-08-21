import apiClient from '@/lib/axios';

/**
 * Expense Service
 * 
 * API Documentation:
 * - GET /api/expenses - Get expenses with pagination, filtering, sorting
 * - GET /api/expenses/{id} - Get expense details
 * - POST /api/expenses - Create new expense
 * - PUT /api/expenses/{id} - Update expense
 * - DELETE /api/expenses/{id} - Delete expense
 * - GET /api/expenses/categories - Get expense categories
 * - GET /api/expenses/trends - Get expense trends
 */

export interface Expense {
  id: string;
  date: string;
  description: string;
  category: string;
  vendor: string;
  amount: number;
  payment_method: string;
  recurring: boolean;
  recurring_frequency?: string;
  receipt_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseListResponse {
  data: Expense[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ExpenseFilter {
  category?: string;
  vendor?: string;
  start_date?: string;
  end_date?: string;
  recurring?: boolean;
}

export interface ExpenseCreateRequest {
  date: string;
  description: string;
  category: string;
  vendor: string;
  amount: number;
  payment_method: string;
  recurring: boolean;
  recurring_frequency?: string;
  notes?: string;
}

export interface ExpenseUpdateRequest extends Partial<ExpenseCreateRequest> {}

export interface ExpenseCategory {
  id: string;
  name: string;
  budget?: number;
  spent: number;
  percentage: number;
}

export interface ExpenseTrend {
  date: string;
  amount: number;
  category: string;
}

class ExpenseService {
  async getExpenses(
    page: number = 1,
    page_size: number = 20,
    filters?: ExpenseFilter,
    sort_by: string = 'date',
    sort_order: 'asc' | 'desc' = 'desc'
  ): Promise<ExpenseListResponse> {
    const response = await apiClient.get('/api/expenses', {
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

  async getExpense(id: string): Promise<Expense> {
    const response = await apiClient.get(`/api/expenses/${id}`);
    return response.data;
  }

  async createExpense(data: ExpenseCreateRequest): Promise<Expense> {
    const response = await apiClient.post('/api/expenses', data);
    return response.data;
  }

  async updateExpense(id: string, data: ExpenseUpdateRequest): Promise<Expense> {
    const response = await apiClient.put(`/api/expenses/${id}`, data);
    return response.data;
  }

  async deleteExpense(id: string): Promise<void> {
    await apiClient.delete(`/api/expenses/${id}`);
  }

  async getCategories(): Promise<ExpenseCategory[]> {
    const response = await apiClient.get('/api/expenses/categories');
    return response.data;
  }

  async getTrends(days: number = 30): Promise<ExpenseTrend[]> {
    const response = await apiClient.get('/api/expenses/trends', {
      params: { days },
    });
    return response.data;
  }
}

export default new ExpenseService();
