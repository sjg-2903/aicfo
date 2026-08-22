import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileBarChart,
  Download,
  FileText,
  Wallet,
  Receipt,
  ShieldAlert,
  Lightbulb,
  Loader2,
  Trash2,
  History as HistoryIcon,
} from 'lucide-react';
import { Card, PageHeader, ErrorState, EmptyState } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { CURRENCY } from '@/lib/format';
import { getErrorMessage } from '@/lib/axios';
import reportService, { type PdfReportMeta, type PdfReportType, type ReportPreview } from '@/services/reportService';
import invoiceService from '@/services/invoiceService';
import recommendationService from '@/services/recommendationService';

const REPORT_TYPES = [
  { id: 'financial_summary', name: 'Financial Recommendations & Performance', desc: 'Revenue, expenses, profit and actionable money advice', icon: FileText },
  { id: 'cash_flow', name: 'Cash Flow Report', desc: 'Detailed cash movement analysis', icon: Wallet },
  { id: 'receivables', name: 'Receivables Report', desc: 'Outstanding invoices and collections', icon: Receipt },
  { id: 'risk', name: 'Risk Report', desc: 'Financial risks and mitigation', icon: ShieldAlert },
  { id: 'recommendations', name: 'Recommendations Report', desc: 'Actionable financial recommendations', icon: Lightbulb },
];

/** Preview types → server-side PDF report types. */
const PDF_TYPE_MAP: Record<string, PdfReportType> = {
  financial_summary: 'financial_summary',
  cash_flow: 'cash_flow',
  receivables: 'comprehensive',
  risk: 'risk',
  recommendations: 'comprehensive',
};

const TONE: Record<string, 'green' | 'red' | 'blue' | 'slate'> = {
  green: 'green',
  red: 'red',
  blue: 'blue',
  slate: 'slate',
};

export default function Reports() {
  const qc = useQueryClient();
  const { addToast } = useToast();
  const [selected, setSelected] = useState('financial_summary');
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const pdfs = useQuery({ queryKey: ['report-pdfs'], queryFn: () => reportService.listPdfs() });

  const generateMutation = useMutation({
    mutationFn: async (type: string): Promise<ReportPreview> => {
      switch (type) {
        case 'financial_summary':
          return reportService.financialSummary();
        case 'cash_flow':
          return reportService.cashflow(30);
        case 'risk':
          return reportService.risk();
        case 'receivables': {
          const invoices = await invoiceService.getInvoices();
          const overdue = invoices.filter((i) => i.status === 'overdue');
          const outstanding = overdue.reduce((s, i) => s + Math.max(0, i.total - i.paid), 0);
          return {
            title: 'Receivables Report',
            generatedAt: new Date().toISOString(),
            stats: [
              { label: 'Outstanding Invoices', value: invoices.length, tone: 'blue' },
              { label: 'Overdue Invoices', value: overdue.length, tone: 'red' },
              { label: 'Overdue Amount', value: outstanding, tone: 'red' },
            ],
            summary: `${overdue.length} overdue invoice(s) totaling ${CURRENCY(outstanding)} need follow-up.`,
          };
        }
        case 'recommendations': {
          const recs = await recommendationService.getRecommendations();
          const critical = recs.filter((r) => r.priority === 'critical' || r.priority === 'high').length;
          return {
            title: 'Financial Recommendations Report',
            generatedAt: new Date().toISOString(),
            stats: [
              { label: 'Total Recommendations', value: recs.length, tone: 'blue' },
              { label: 'High Priority', value: critical, tone: 'red' },
            ],
            summary: `${recs.length} recommendation(s) generated to optimize capital, increase profit, and reduce expenses.`,
          };
        }
        default:
          return reportService.financialSummary();
      }
    },
    onSuccess: (p) => {
      setPreview(p);
      setError(null);
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const downloadMutation = useMutation({
    mutationFn: async (type: string) => {
      const meta = await reportService.generatePdf(PDF_TYPE_MAP[type] || 'comprehensive');
      setDownloadingId(meta.id);
      await reportService.downloadPdf(meta.id, meta.filename);
      return meta;
    },
    onSuccess: (meta) => {
      setDownloadingId(null);
      qc.invalidateQueries({ queryKey: ['report-pdfs'] });
      qc.invalidateQueries({ queryKey: ['history'] });
      addToast(`${meta.title} generated and downloaded`, 'success');
    },
    onError: (e) => {
      setDownloadingId(null);
      addToast(getErrorMessage(e), 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reportService.deletePdf(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report-pdfs'] });
      qc.invalidateQueries({ queryKey: ['history'] });
      addToast('Report deleted', 'success');
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const reDownload = async (meta: PdfReportMeta) => {
    setDownloadingId(meta.id);
    try {
      await reportService.downloadPdf(meta.id, meta.filename);
    } catch (e) {
      addToast(getErrorMessage(e), 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const generate = () => generateMutation.mutate(selected);
  const selectedType = REPORT_TYPES.find((r) => r.id === selected);

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" subtitle="Generate, download and manage professional PDF reports" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report configuration */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <FileBarChart className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Generate Report
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-300 block mb-2">Report Type</label>
                <select
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm outline-none focus:border-blue-400"
                >
                  {REPORT_TYPES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={generate}
                disabled={generateMutation.isPending}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {generateMutation.isPending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating…
                  </>
                ) : (
                  <>Preview Report</>
                )}
              </button>
              <button
                onClick={() => downloadMutation.mutate(selected)}
                disabled={downloadMutation.isPending}
                className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {downloadMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating PDF…
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" /> Generate &amp; Download PDF
                  </>
                )}
              </button>
              {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
              <p className="text-xs text-slate-400 dark:text-slate-500">
                The PDF includes financial metrics, charts, recommendations, and key insights built from your live business data.
              </p>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Report Types</h3>
            <div className="space-y-2">
              {REPORT_TYPES.map((r) => {
                const Icon = r.icon;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelected(r.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition cursor-pointer ${
                      selected === r.id
                        ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${selected === r.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{r.name}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{r.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Preview */}
        <div className="lg:col-span-2 space-y-4">
          {preview ? (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Report Preview</h3>
                <button
                  onClick={() => downloadMutation.mutate(selected)}
                  disabled={downloadMutation.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-lg text-sm font-medium transition cursor-pointer"
                >
                  {downloadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Download PDF
                </button>
              </div>
              <div className="space-y-4">
                <div className="text-center pb-4 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-sm text-slate-400 dark:text-slate-500">AI CFO — {preview.title}</p>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">{selectedType?.name}</h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Generated {new Date(preview.generatedAt).toLocaleString('en-IN')}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {preview.stats.map((s) => (
                    <PreviewStat key={s.label} label={s.label} value={s.value} tone={TONE[s.tone] || 'slate'} icon={<FileText className="w-4 h-4" />} />
                  ))}
                </div>
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40">
                  <p className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1">Financial Advisory Insight</p>
                  <p className="text-sm text-blue-800 dark:text-blue-200">{preview.summary}</p>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-6">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Report Preview</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Select a report type and click <span className="font-medium text-slate-700 dark:text-slate-300">Preview Report</span> to build a real-time preview from your financial data, or{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">Generate &amp; Download PDF</span> to save a professional PDF.
              </p>
            </Card>
          )}

          {/* Previously generated PDFs */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <HistoryIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Generated PDF Reports
              </h3>
            </div>
            {pdfs.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : pdfs.isError ? (
              <ErrorState message={getErrorMessage(pdfs.error)} onRetry={() => pdfs.refetch()} />
            ) : (pdfs.data || []).length === 0 ? (
              <EmptyState
                title="No PDF reports yet"
                description="Generate your first report above — it will be saved here and in your activity history."
              />
            ) : (
              <div className="space-y-2">
                {(pdfs.data || []).map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition group">
                    <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{r.title}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {new Date(r.generated_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} ·{' '}
                        {(r.size_bytes / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <button
                      onClick={() => reDownload(r)}
                      disabled={downloadingId === r.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 rounded-lg transition cursor-pointer"
                    >
                      {downloadingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      Download
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(r.id)}
                      className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                      aria-label="Delete report"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function PreviewStat({ label, value, tone, icon }: { label: string; value: number; tone: string; icon: React.ReactNode }) {
  const toneClass = tone === 'green' ? 'text-green-600 dark:text-green-400' : tone === 'red' ? 'text-red-600 dark:text-red-400' : tone === 'blue' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-white';
  return (
    <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 flex items-center gap-3">
      <div className="text-slate-400 dark:text-slate-500">{icon}</div>
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className={`text-lg font-bold ${toneClass}`}>{CURRENCY(value)}</p>
      </div>
    </div>
  );
}
