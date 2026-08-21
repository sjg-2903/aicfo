import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { FileBarChart, Download, FileText, Wallet, Receipt, ShieldAlert, Lightbulb } from 'lucide-react';
import { Card, PageHeader } from '@/components/ui';
import { CURRENCY } from '@/lib/format';
import { getErrorMessage } from '@/lib/axios';
import reportService, { type ReportPreview } from '@/services/reportService';
import invoiceService from '@/services/invoiceService';
import recommendationService from '@/services/recommendationService';

const REPORT_TYPES = [
  { id: 'financial_summary', name: 'Financial Summary', desc: 'Revenue, expenses and profitability overview', icon: FileText },
  { id: 'cash_flow', name: 'Cash Flow Report', desc: 'Detailed cash movement analysis', icon: Wallet },
  { id: 'receivables', name: 'Receivables Report', desc: 'Outstanding invoices and collections', icon: Receipt },
  { id: 'risk', name: 'Risk Report', desc: 'Financial risks and mitigation', icon: ShieldAlert },
  { id: 'recommendations', name: 'Recommendations Report', desc: 'AI-generated action items', icon: Lightbulb },
];

const TONE: Record<string, 'green' | 'red' | 'blue' | 'slate'> = {
  green: 'green',
  red: 'red',
  blue: 'blue',
  slate: 'slate',
};

export default function Reports() {
  const [selected, setSelected] = useState('financial_summary');
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

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
            title: 'Recommendations Report',
            generatedAt: new Date().toISOString(),
            stats: [
              { label: 'Total Recommendations', value: recs.length, tone: 'blue' },
              { label: 'High Priority', value: critical, tone: 'red' },
            ],
            summary: `${recs.length} recommendation(s) generated from your actual financial data.`,
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

  const generate = () => generateMutation.mutate(selected);
  const selectedType = REPORT_TYPES.find((r) => r.id === selected);

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" subtitle="Generate and download financial reports" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report configuration */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <FileBarChart className="w-5 h-5 text-blue-600" /> Generate Report
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600 block mb-2">Report Type</label>
                <select value={selected} onChange={(e) => setSelected(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400">
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
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
              >
                {generateMutation.isPending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating…
                  </>
                ) : (
                  <>Generate Report</>
                )}
              </button>
              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-base font-semibold text-slate-900 mb-4">Report Types</h3>
            <div className="space-y-2">
              {REPORT_TYPES.map((r) => {
                const Icon = r.icon;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelected(r.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition ${selected === r.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'}`}
                  >
                    <Icon className={`w-4 h-4 ${selected === r.id ? 'text-blue-600' : 'text-slate-400'}`} />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{r.name}</p>
                      <p className="text-xs text-slate-400">{r.desc}</p>
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
                <h3 className="text-base font-semibold text-slate-900">Report Preview</h3>
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition">
                  <Download className="w-4 h-4" /> Download PDF
                </button>
              </div>
              <div className="space-y-4">
                <div className="text-center pb-4 border-b border-slate-100">
                  <p className="text-sm text-slate-400">AI CFO — {preview.title}</p>
                  <h4 className="text-lg font-bold text-slate-900">{selectedType?.name}</h4>
                  <p className="text-xs text-slate-400">Generated {new Date(preview.generatedAt).toLocaleString('en-IN')}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {preview.stats.map((s) => (
                    <PreviewStat key={s.label} label={s.label} value={s.value} tone={TONE[s.tone] || 'slate'} icon={<FileText className="w-4 h-4" />} />
                  ))}
                </div>
                <div className="p-4 rounded-lg bg-blue-50">
                  <p className="text-xs text-blue-700 font-medium mb-1">AI Summary</p>
                  <p className="text-sm text-blue-800">{preview.summary}</p>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-6">
              <h3 className="text-base font-semibold text-slate-900 mb-4">Report Preview</h3>
              <p className="text-sm text-slate-500">
                Select a report type and click <span className="font-medium">Generate Report</span> to build a real-time report from your financial data.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewStat({ label, value, tone, icon }: { label: string; value: number; tone: string; icon: React.ReactNode }) {
  const toneClass = tone === 'green' ? 'text-green-600' : tone === 'red' ? 'text-red-600' : tone === 'blue' ? 'text-blue-600' : 'text-slate-900';
  return (
    <div className="p-4 rounded-lg bg-slate-50 flex items-center gap-3">
      <div className="text-slate-400">{icon}</div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className={`text-lg font-bold ${toneClass}`}>{CURRENCY(value)}</p>
      </div>
    </div>
  );
}
