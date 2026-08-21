import apiClient from '@/lib/axios';

/**
 * Report Service — backed by FastAPI
 *  - GET /api/reports/financial-summary
 *  - GET /api/reports/cashflow
 *  - GET /api/reports/risk
 */

export interface ReportPreview {
  title: string;
  generatedAt: string;
  stats: { label: string; value: number; tone: 'green' | 'red' | 'blue' | 'slate' }[];
  summary: string;
}

class ReportService {
  async financialSummary(): Promise<ReportPreview> {
    const response = await apiClient.get('/api/reports/financial-summary');
    const r = response.data as {
      generated_at: string;
      metrics: { revenue: { current: number }; expenses: { current: number }; net_profit: { current: number }; cash_balance: { current: number } };
      financial_health: { score: number; label: string; interpretation: string };
    };
    const m = r.metrics;
    return {
      title: 'Financial Summary',
      generatedAt: r.generated_at,
      stats: [
        { label: 'Revenue', value: m.revenue.current, tone: 'green' },
        { label: 'Expenses', value: m.expenses.current, tone: 'red' },
        { label: 'Net Profit', value: m.net_profit.current, tone: 'blue' },
        { label: 'Cash Balance', value: m.cash_balance.current, tone: 'slate' },
      ],
      summary: `Financial health: ${r.financial_health.score}/100 (${r.financial_health.label}). ${r.financial_health.interpretation}`,
    };
  }

  async cashflow(days = 30): Promise<ReportPreview> {
    const response = await apiClient.get('/api/reports/cashflow', { params: { days } });
    const r = response.data as {
      generated_at: string;
      totals: { inflow: number; outflow: number; net_cash_flow: number };
    };
    return {
      title: 'Cash Flow Report',
      generatedAt: r.generated_at,
      stats: [
        { label: 'Inflow', value: r.totals.inflow, tone: 'green' },
        { label: 'Outflow', value: r.totals.outflow, tone: 'red' },
        { label: 'Net Cash Flow', value: r.totals.net_cash_flow, tone: r.totals.net_cash_flow >= 0 ? 'blue' : 'red' },
      ],
      summary: `Net cash flow over the period was ${r.totals.net_cash_flow >= 0 ? 'positive' : 'negative'}.`,
    };
  }

  async risk(): Promise<ReportPreview> {
    const response = await apiClient.get('/api/reports/risk');
    const r = response.data as {
      generated_at: string;
      risk_score: number;
      risk_level: string;
      risks: { title: string; severity: string; impact?: number }[];
    };
    const critical = r.risks.filter((x) => x.severity === 'critical' || x.severity === 'high').length;
    return {
      title: 'Risk Report',
      generatedAt: r.generated_at,
      stats: [
        { label: 'Risk Score', value: r.risk_score, tone: 'slate' },
        { label: 'High/Critical Risks', value: critical, tone: 'red' },
        { label: 'Total Risks', value: r.risks.length, tone: 'blue' },
      ],
      summary: `Overall risk level: ${r.risk_level} (score ${r.risk_score}/100). ${critical} risk(s) need attention.`,
    };
  }

  // ── PDF reports (generated server-side, stored, re-downloadable) ──────────

  async generatePdf(reportType: PdfReportType): Promise<PdfReportMeta> {
    const response = await apiClient.post('/api/reports/pdf', { report_type: reportType }, { timeout: 180000 });
    return response.data as PdfReportMeta;
  }

  async listPdfs(): Promise<PdfReportMeta[]> {
    const response = await apiClient.get('/api/reports/pdf');
    const rows: unknown[] = Array.isArray(response.data) ? response.data : [];
    return rows as PdfReportMeta[];
  }

  async deletePdf(id: string): Promise<void> {
    await apiClient.delete(`/api/reports/pdf/${id}`);
  }

  /** Download a stored PDF through the authenticated client. */
  async downloadPdf(id: string, filename: string): Promise<void> {
    const response = await apiClient.get(`/api/reports/pdf/${id}`, {
      responseType: 'blob',
      timeout: 120000,
    });
    const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'aicfo-report.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

export type PdfReportType = 'comprehensive' | 'financial_summary' | 'cash_flow' | 'risk';

export interface PdfReportMeta {
  id: string;
  title: string;
  report_type: PdfReportType;
  filename: string;
  size_bytes: number;
  generated_at: string;
  created_at?: string;
}

export default new ReportService();
