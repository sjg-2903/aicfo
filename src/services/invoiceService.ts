import apiClient from '@/lib/axios';
import { mapInvoice, type InvoiceRow } from '@/lib/mappers';

/**
 * Invoice Service — backed by FastAPI
 *  - GET  /api/invoices
 *  - POST /api/invoices
 *  - PUT  /api/invoices/{id}
 *  - PUT  /api/invoices/{id}/mark-paid
 *  - PUT  /api/invoices/{id}/send
 *  - DELETE /api/invoices/{id}
 *  - GET  /api/invoices/overdue
 */

export interface InvoiceCreateRequest {
  invoice_number: string;
  customer_name: string;
  customer_email?: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  paid_amount?: number;
  status?: string;
}

const LIMIT = 500;

class InvoiceService {
  async getInvoices(): Promise<InvoiceRow[]> {
    const response = await apiClient.get('/api/invoices', { params: { page: 1, limit: LIMIT, sort_by: 'invoice_date', sort_order: 'desc' } });
    const rows: unknown[] = Array.isArray(response.data) ? response.data : [];
    return rows.map((r) => mapInvoice(r as Parameters<typeof mapInvoice>[0]));
  }

  async createInvoice(data: InvoiceCreateRequest): Promise<InvoiceRow> {
    const response = await apiClient.post('/api/invoices', data);
    return mapInvoice(response.data);
  }

  async updateInvoice(id: string, data: Partial<InvoiceCreateRequest>): Promise<InvoiceRow> {
    const response = await apiClient.put(`/api/invoices/${id}`, data);
    return mapInvoice(response.data);
  }

  async markAsPaid(id: string, paid_amount: number): Promise<InvoiceRow> {
    const response = await apiClient.put(`/api/invoices/${id}/mark-paid`, { paid_amount });
    return mapInvoice(response.data);
  }

  async sendInvoice(id: string): Promise<InvoiceRow> {
    const response = await apiClient.put(`/api/invoices/${id}/send`);
    return mapInvoice(response.data);
  }

  async deleteInvoice(id: string): Promise<void> {
    await apiClient.delete(`/api/invoices/${id}`);
  }
}

export default new InvoiceService();
