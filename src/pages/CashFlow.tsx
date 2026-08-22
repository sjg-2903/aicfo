import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Wallet, Activity } from 'lucide-react';
import { Card, ChartCard, PageHeader, ErrorState } from '@/components/ui';
import SegmentStepsGuide from '@/components/SegmentStepsGuide';
import { CURRENCY, moneyTooltip } from '@/lib/format';
import { getErrorMessage } from '@/lib/axios';
import dashboardService from '@/services/dashboardService';
import forecastService from '@/services/forecastService';

const CONFIDENCE_PCT: Record<string, number> = { high: 88, medium: 64, low: 40 };

export default function CashFlow() {
  const summary = useQuery({ queryKey: ['dashboard-summary'], queryFn: () => dashboardService.getKPISummary() });
  const forecast = useQuery({ queryKey: ['forecast'], queryFn: () => forecastService.getCashFlowForecast() });

  const kpi = summary.data;
  const f = forecast.data;

  const chartData = useMemo(() => {
    if (!f || !kpi) return [];
    let balance = kpi.cashBalance.current;
    const rows = [{ date: 'Today', balance: Math.round(balance), predicted: false }];
    f.points.forEach((p) => {
      balance += p.predictedNet;
      rows.push({ date: p.date, balance: Math.round(balance), predicted: true });
    });
    return rows;
  }, [f, kpi]);

  const riskPoints = useMemo(() => {
    if (!f) return [];
    return f.points
      .filter((p) => p.predictedNet < 0)
      .slice(0, 5)
      .map((p) => ({ date: p.date, description: `Projected net outflow of ${CURRENCY(Math.abs(p.predictedNet))}` }));
  }, [f]);

  if (summary.isError || forecast.isError) {
    const err = summary.error || forecast.error;
    return (
      <div className="space-y-6">
        <PageHeader title="Cash Flow" subtitle="Historical performance and 30-day forecast" />
        <Card>
          <ErrorState message={getErrorMessage(err)} onRetry={() => (summary.isError ? summary.refetch() : forecast.refetch())} />
        </Card>
      </div>
    );
  }

  const confidence = f ? CONFIDENCE_PCT[f.confidence] ?? 50 : 0;
  const currentBalance = kpi?.cashBalance.current ?? 0;
  const monthInflow = kpi?.revenue.current ?? 0;
  const monthOutflow = kpi?.expenses.current ?? 0;
  const netCashFlow = kpi?.netProfit.current ?? 0;
  const predictedInflow = f?.summary.totalInflow ?? 0;
  const predictedOutflow = f?.summary.totalOutflow ?? 0;
  const predictedNet = f?.summary.netCashFlow ?? 0;
  const projectedBalance = currentBalance + predictedNet;

  return (
    <div className="space-y-6">
      <PageHeader title="Cash Flow" subtitle="Historical performance and 30-day forecast" />

      {/* Segment Steps Guide */}
      <SegmentStepsGuide segment="cash-flow" defaultExpanded={false} />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric label="Current Balance" value={currentBalance} icon={<Wallet className="w-4 h-4" />} />
        <Metric label="Net Cash Flow (MTD)" value={netCashFlow} icon={<TrendingUp className="w-4 h-4" />} positive />
        <Metric label="Projected Balance" value={projectedBalance} icon={<Activity className="w-4 h-4" />} />
        <Metric label="Predicted Net (next 30d)" value={predictedNet} icon={<TrendingDown className="w-4 h-4" />} negative />
      </div>

      {/* Forecast chart */}
      <ChartCard title="30-Day Cash Flow Forecast" subtitle={`Projected balance · ${f?.model || 'forecast'} model`}>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={chartData}>
            <defs>
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
            <ReferenceLine y={0} stroke="#f97316" strokeDasharray="4 4" label={{ value: 'Break-even', position: 'insideTopRight', fontSize: 10, fill: '#f97316' }} />
            <Area type="monotone" dataKey="balance" name="Projected Balance" stroke="#2563eb" fill="url(#cfPred)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Inflow/outflow + risks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">This Month</h3>
          <div className="space-y-3">
            <Row label="Cash Inflow" value={monthInflow} positive />
            <Row label="Cash Outflow" value={monthOutflow} negative />
            <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
              <Row label="Net Cash Flow" value={netCashFlow} positive bold />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Projected (next 30d)</h3>
          <div className="space-y-3">
            <Row label="Predicted Inflow" value={predictedInflow} positive />
            <Row label="Predicted Outflow" value={predictedOutflow} negative />
            <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
              <Row label="Predicted Net" value={predictedNet} negative bold />
            </div>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
            Forecast confidence: <span className="font-semibold text-slate-600 dark:text-slate-300">{confidence}%</span>
          </p>
        </Card>

        <Card className="p-5 border-l-4 border-l-amber-500">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Risk Indicators</h3>
          <div className="space-y-3">
            {riskPoints.length === 0 && <p className="text-xs text-slate-400 dark:text-slate-500">No projected cash shortfalls in the next 30 days.</p>}
            {riskPoints.map((r) => (
              <div key={r.date} className="flex items-start gap-2">
                <span className="mt-1 w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{r.date}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{r.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value, icon, positive, negative }: { label: string; value: number; icon: React.ReactNode; positive?: boolean; negative?: boolean }) {
  const tone = positive ? 'text-green-600 dark:text-green-400' : negative ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white';
  return (
    <Card className="p-4 hover">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <span className="text-slate-400 dark:text-slate-500">{icon}</span>
      </div>
      <p className={`text-lg font-bold ${tone}`}>{CURRENCY(value)}</p>
    </Card>
  );
}

function Row({ label, value, positive, negative, bold }: { label: string; value: number; positive?: boolean; negative?: boolean; bold?: boolean }) {
  const tone = positive ? 'text-green-600 dark:text-green-400' : negative ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white';
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${bold ? 'font-semibold text-slate-700 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>{label}</span>
      <span className={`text-sm ${bold ? 'font-bold' : 'font-medium'} ${tone}`}>{CURRENCY(value)}</span>
    </div>
  );
}
