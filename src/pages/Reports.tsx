import { useState } from 'react';
import { FileBarChart, Download, FileText, TrendingUp, Wallet, Receipt, ShieldAlert, Lightbulb } from 'lucide-react';
import { Card, PageHeader } from '@/components/ui';
import { CURRENCY } from '@/lib/format';
import { mockKpiSummary } from '@/mock';

const REPORT_TYPES = [
  { id: 'financial_summary', name: 'Financial Summary', desc: 'Revenue, expenses and profitability overview', icon: FileText },
  { id: 'cash_flow', name: 'Cash Flow Report', desc: 'Detailed cash movement analysis', icon: Wallet },
  { id: 'receivables', name: 'Receivables Report', desc: 'Outstanding invoices and collections', icon: Receipt },
  { id: 'risk', name: 'Risk Report', desc: 'Financial risks and mitigation', icon: ShieldAlert },
  { id: 'recommendations', name: 'Recommendations Report', desc: 'AI-generated action items', icon: Lightbulb },
];

const HISTORY = [
  { id: 'r-1', name: 'Financial Summary', date: '2026-01-25', period: 'Dec 2025', status: 'completed' },
  { id: 'r-2', name: 'Cash Flow Report', date: '2026-01-20', period: 'Jan 2026', status: 'completed' },
  { id: 'r-3', name: 'GST Summary', date: '2026-01-15', period: 'Q3 2025', status: 'completed' },
];

export default function Reports() {
  const [selected, setSelected] = useState('financial_summary');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-01-31');
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState(false);

  const generate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setPreview(true);
    }, 1200);
  };

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
                <select
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400"
                >
                  {REPORT_TYPES.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-600 block mb-2">From</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 block mb-2">To</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400" />
                </div>
              </div>
              <button
                onClick={generate}
                disabled={generating}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating…
                  </>
                ) : (
                  <>Generate Report</>
                )}
              </button>
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

        {/* Preview / history */}
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
                  <p className="text-sm text-slate-400">AI CFO — {REPORT_TYPES.find((r) => r.id === selected)?.name}</p>
                  <h4 className="text-lg font-bold text-slate-900">Acme Industries Pvt. Ltd.</h4>
                  <p className="text-xs text-slate-400">Period: {startDate} to {endDate}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <PreviewStat label="Revenue" value={mockKpiSummary.revenue.current} tone="text-green-600" icon={<TrendingUp className="w-4 h-4" />} />
                  <PreviewStat label="Expenses" value={mockKpiSummary.expenses.current} tone="text-red-600" icon={<Receipt className="w-4 h-4" />} />
                  <PreviewStat label="Net Profit" value={mockKpiSummary.netProfit.current} tone="text-blue-600" icon={<TrendingUp className="w-4 h-4" />} />
                  <PreviewStat label="Cash Balance" value={mockKpiSummary.cashBalance.current} tone="text-slate-900" icon={<Wallet className="w-4 h-4" />} />
                </div>
                <div className="p-4 rounded-lg bg-blue-50">
                  <p className="text-xs text-blue-700 font-medium mb-1">AI Summary</p>
                  <p className="text-sm text-blue-800">Revenue grew 12.4% quarter over quarter with healthy net margins. Primary watch items: debt leverage and rising DSO.</p>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-6">
              <h3 className="text-base font-semibold text-slate-900 mb-4">Report History</h3>
              <div className="divide-y divide-slate-100">
                {HISTORY.map((h) => (
                  <div key={h.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{h.name}</p>
                        <p className="text-xs text-slate-400">{h.period} · {h.date}</p>
                      </div>
                    </div>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition">
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewStat({ label, value, tone, icon }: { label: string; value: number; tone: string; icon: React.ReactNode }) {
  return (
    <div className="p-4 rounded-lg bg-slate-50 flex items-center gap-3">
      <div className="text-slate-400">{icon}</div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className={`text-lg font-bold ${tone}`}>{CURRENCY(value)}</p>
      </div>
    </div>
  );
}
