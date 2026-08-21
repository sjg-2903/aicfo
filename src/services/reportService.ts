import apiClient from '@/lib/axios';

/**
 * Report Service
 * 
 * API Documentation:
 * - GET /api/reports - Get available report types
 * - POST /api/reports/generate - Generate report
 * - GET /api/reports/{id} - Get generated report
 * - GET /api/reports/{id}/download - Download report as PDF/Excel
 * - GET /api/reports/history - Get report generation history
 */

export interface ReportType {
  id: string;
  name: string;
  description: string;
  format: string;
}

export interface GenerateReportRequest {
  report_type: string;
  start_date: string;
  end_date: string;
  include_sections: string[];
}

export interface ReportData {
  id: string;
  report_type: string;
  title: string;
  generated_at: string;
  period: {
    start_date: string;
    end_date: string;
  };
  summary: Record<string, unknown>;
  sections: Array<{
    title: string;
    content: Record<string, unknown>;
  }>;
}

export interface ReportHistory {
  id: string;
  report_type: string;
  generated_at: string;
  generated_by: string;
  period_start: string;
  period_end: string;
  status: 'completed' | 'failed';
}

class ReportService {
  async getReportTypes(): Promise<ReportType[]> {
    const response = await apiClient.get('/api/reports');
    return response.data;
  }

  async generateReport(request: GenerateReportRequest): Promise<ReportData> {
    const response = await apiClient.post('/api/reports/generate', request);
    return response.data;
  }

  async getReport(id: string): Promise<ReportData> {
    const response = await apiClient.get(`/api/reports/${id}`);
    return response.data;
  }

  async downloadReport(id: string, format: 'pdf' | 'excel' = 'pdf'): Promise<Blob> {
    const response = await apiClient.get(`/api/reports/${id}/download`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  }

  async getReportHistory(
    page: number = 1,
    page_size: number = 20
  ): Promise<{
    data: ReportHistory[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  }> {
    const response = await apiClient.get('/api/reports/history', {
      params: { page, page_size },
    });
    return response.data;
  }
}

export default new ReportService();
