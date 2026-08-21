import apiClient from '@/lib/axios';

/**
 * Invoice Service
 * 
 * API Documentation:
 * - GET /api/invoices - Get invoices with pagination, filtering, sorting
 * - GET /api/invoices/{id} - Get invoice details
 * - POST /api/invoices - Create new invoice
 * - PUT /api/invoices/{id} - Update invoice
 * - DELETE /api/invoices/{id} - Delete invoice
 * - GET /api/invoices/{id}/pdf - Download invoice as PDF
 * - PUT /api/invoices/{id}/send - Send invoice to customer
 * - PUT /api/invoices/{id}/mark-paid - Mark invoice as paid
 */

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  customer_email?: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  status: InvoiceStatus;
  items: InvoiceItem[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface InvoiceListResponse {
  data: Invoice[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface InvoiceFilter {
  status?: InvoiceStatus;
  customer_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface InvoiceCreateRequest {
  customer_name: string;
  customer_email?: string;
  customer_id?: string;
  invoice_date: string;
  due_date: string;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
  }>;
  notes?: string;
}

export interface InvoiceUpdateRequest extends Partial<InvoiceCreateRequest> {}

class InvoiceService {
  async getInvoices(
    page: number = 1,
    page_size: number = 20,
    filters?: InvoiceFilter,
    sort_by: string = 'invoice_date',
    sort_order: 'asc' | 'desc' = 'desc'
  ): Promise<InvoiceListResponse> {
    const response = await apiClient.get('/api/invoices', {
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

  async getInvoice(id: string): Promise<Invoice> {
    const response = await apiClient.get(`/api/invoices/${id}`);
    return response.data;
  }

  async createInvoice(data: InvoiceCreateRequest): Promise<Invoice> {
    const response = await apiClient.post('/api/invoices', data);
    return response.data;
  }

  async updateInvoice(id: string, data: InvoiceUpdateRequest): Promise<Invoice> {
    const response = await apiClient.put(`/api/invoices/${id}`, data);
    return response.data;
  }

  async deleteInvoice(id: string): Promise<void> {
    await apiClient.delete(`/api/invoices/${id}`);
  }

  async downloadInvoicePDF(id: string): Promise<Blob> {
    const response = await apiClient.get(`/api/invoices/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async sendInvoice(id: string): Promise<Invoice> {
    const response = await apiClient.put(`/api/invoices/${id}/send`);
    return response.data;
  }

  async markAsPaid(id: string, paid_amount: number): Promise<Invoice> {
    const response = await apiClient.put(`/api/invoices/${id}/mark-paid`, {
      paid_amount,
    });
    return response.data;
  }
}

export default new InvoiceService();
