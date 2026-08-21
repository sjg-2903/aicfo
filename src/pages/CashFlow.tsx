import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Wallet, Activity } from 'lucide-react';
import { Card, ChartCard, PageHeader } from '@/components/ui';
import { mockCashFlowForecast, mockCashFlowModule } from '@/mock';
import { CURRENCY, moneyTooltip } from '@/lib/format';

export default function CashFlow() {
  const cm = mockCashFlowModule;
  // Split historical vs predicted
  const historical = mockCashFlowForecast.filter((p) => p.type === 'historical');
  const predicted = mockCashFlowForecast.filter((p) => p.type === 'predicted');

  return (
    <div className="space-y-6">
      <PageHeader title="Cash Flow" subtitle="Historical performance and 30-day forecast" />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric label="Current Balance" value={cm.currentBalance} icon={<Wallet className="w-4 h-4" />} />
        <Metric label="Net Cash Flow (MTD)" value={cm.netCashFlow} icon={<TrendingUp className="w-4 h-4" />} positive />
        <Metric label="Projected Balance" value={cm.projectedBalance} icon={<Activity className="w-4 h-4" />} />
        <Metric label="Predicted Net (next 30d)" value={cm.predictedNet} icon={<TrendingDown className="w-4 h-4" />} negative />
      </div>

      {/* Forecast chart */}
      <ChartCard
        title="30-Day Cash Flow Forecast"
        subtitle="Blue = predicted · green = actual balance"
      >
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={mockCashFlowForecast}>
            <defs>
              <linearGradient id="cfHist" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="cfPred" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} interval={2} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 100000}L`} />
            <Tooltip formatter={moneyTooltip} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={1500000} stroke="#f97316" strokeDasharray="4 4" label={{ value: 'Safety threshold', position: 'insideTopRight', fontSize: 10, fill: '#f97316' }} />
            <Area type="monotone" dataKey="balance" name="Cash Balance" stroke="#2563eb" fill="url(#cfPred)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Inflow/outflow + risks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">This Month</h3>
          <div className="space-y-3">
            <Row label="Cash Inflow" value={cm.monthInflow} positive />
            <Row label="Cash Outflow" value={cm.monthOutflow} negative />
            <div className="border-t border-slate-100 pt-3">
              <Row label="Net Cash Flow" value={cm.netCashFlow} positive bold />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Projected (next 30d)</h3>
          <div className="space-y-3">
            <Row label="Predicted Inflow" value={cm.predictedInflow} positive />
            <Row label="Predicted Outflow" value={cm.predictedOutflow} negative />
            <div className="border-t border-slate-100 pt-3">
              <Row label="Predicted Net" value={cm.predictedNet} negative bold />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">Forecast confidence: <span className="font-semibold text-slate-600">{cm.confidence}%</span></p>
        </Card>

        <Card className="p-5 border-l-4 border-l-amber-500">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Risk Indicators</h3>
          <div className="space-y-3">
            {cm.riskPoints.map((r) => (
              <div key={r.date} className="flex items-start gap-2">
                <span className="mt-1 w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-700">{r.date}</p>
                  <p className="text-xs text-slate-500">{r.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <p className="text-xs text-slate-400">
        Historical period: {historical.length} days · Forecast period: {predicted.length} days · Forecast generated by the Cash Flow Agent
      </p>
    </div>
  );
}

function Metric({ label, value, icon, positive, negative }: { label: string; value: number; icon: React.ReactNode; positive?: boolean; negative?: boolean }) {
  const color = positive ? 'text-green-600' : negative ? 'text-red-600' : 'text-slate-900';
  return (
    <Card className="p-5 hover">
      <div className="flex items-center gap-2 mb-1 text-slate-400">{icon}<span className="text-xs text-slate-500">{label}</span></div>
      <p className={`text-xl font-bold ${color}`}>{CURRENCY(value)}</p>
    </Card>
  );
}

function Row({ label, value, positive, negative, bold }: { label: string; value: number; positive?: boolean; negative?: boolean; bold?: boolean }) {
  const color = positive ? 'text-green-600' : negative ? 'text-red-600' : 'text-slate-900';
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`${bold ? 'text-base font-bold' : 'text-sm font-semibold'} ${color}`}>{CURRENCY(value)}</span>
    </div>
  );
}
