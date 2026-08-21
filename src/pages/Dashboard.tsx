import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Wallet,
  Receipt,
  Banknote,
  ArrowRight,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { KPICard } from '@/components/KPICard';
import { Card, ChartCard, PageHeader, ScoreRing, ErrorState } from '@/components/ui';
import { CURRENCY, moneyTooltip } from '@/lib/format';
import { getErrorMessage } from '@/lib/axios';
import { shortMonth } from '@/lib/mappers';
import dashboardService from '@/services/dashboardService';
import loanService from '@/services/loanService';
import riskService from '@/services/riskService';

const PIE_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#f97316', '#8b5cf6', '#64748b'];

export default function Dashboard() {
  const summary = useQuery({ queryKey: ['dashboard-summary'], queryFn: () => dashboardService.getKPISummary() });
  const monthly = useQuery({ queryKey: ['monthly-series'], queryFn: () => dashboardService.getMonthlySeries(6) });
  const revenueTrend = useQuery({ queryKey: ['revenue-trend'], queryFn: () => dashboardService.getRevenueTrend(30) });
  const cashFlowTrend = useQuery({ queryKey: ['cash-flow-trend'], queryFn: () => dashboardService.getCashFlowTrend(30) });
  const expenseDist = useQuery({ queryKey: ['expense-distribution'], queryFn: () => dashboardService.getExpenseDistribution() });
  const aging = useQuery({ queryKey: ['receivables-aging'], queryFn: () => dashboardService.getReceivablesAging() });
  const forecast = useQuery({ queryKey: ['forecast'], queryFn: () => dashboardService.getForecast() });
  const loans = useQuery({ queryKey: ['loans'], queryFn: () => loanService.getLoans() });
  const risk = useQuery({ queryKey: ['risk'], queryFn: () => riskService.getAssessment() });

  const kpi = summary.data;
  const loading = summary.isLoading;

  const healthColor = kpi ? (kpi.healthScore.score >= 75 ? '#10b981' : kpi.healthScore.score >= 55 ? '#f59e0b' : '#ef4444') : '#10b981';

  const monthlyData = useMemo(
    () => (monthly.data || []).map((m) => ({ month: shortMonth(m.month), revenue: m.revenue, expenses: m.expenses })),
    [monthly.data]
  );

  const forecastData = useMemo(() => {
    if (!forecast.data || !kpi) return [];
    let balance = kpi.cashBalance.current;
    return forecast.data.points.map((p) => {
      balance += p.predictedNet;
      return { date: p.date, balance: Math.round(balance), net: p.predictedNet };
    });
  }, [forecast.data, kpi]);

  const loanOverview = useMemo(
    () =>
      (loans.data || []).map((l) => ({
        name: `${l.type} — ${l.lender}`,
        outstanding: l.outstanding,
        emi: l.emi,
        progress: l.principal > 0 ? Math.max(0, Math.round((1 - l.outstanding / l.principal) * 100)) : 0,
      })),
    [loans.data]
  );

  const topRisk = useMemo(() => {
    const risks = risk.data?.risks || [];
    return risks.find((r) => r.severity === 'high' || r.severity === 'critical') || risks[0];
  }, [risk.data]);

  if (summary.isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" subtitle="A live overview of your business's financial health" />
        <Card>
          <ErrorState message={getErrorMessage(summary.error)} onRetry={() => summary.refetch()} />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="A live overview of your business's financial health"
        actions={
          <Link
            to="/ai-cfo"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
          >
            <Sparkles className="w-4 h-4" /> Ask AI CFO
          </Link>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <KPICard title="Revenue" value={kpi?.revenue.current ?? 0} trend={kpi?.revenue.change} trendLabel={kpi?.revenue.label} icon={<TrendingUp className="w-5 h-5" />} loading={loading} format="currency" />
        <KPICard title="Expenses" value={kpi?.expenses.current ?? 0} trend={kpi?.expenses.change} trendLabel={kpi?.expenses.label} icon={<Receipt className="w-5 h-5" />} loading={loading} format="currency" />
        <KPICard title="Net Profit" value={kpi?.netProfit.current ?? 0} trend={kpi?.netProfit.change} trendLabel={kpi?.netProfit.label} icon={<IndianRupee className="w-5 h-5" />} loading={loading} format="currency" />
        <KPICard title="Cash Balance" value={kpi?.cashBalance.current ?? 0} trendLabel={kpi?.cashBalance.label} icon={<Wallet className="w-5 h-5" />} loading={loading} format="currency" />
        <KPICard
          title="Outstanding Receivables"
          value={kpi?.receivables.current ?? 0}
          trendLabel={`${CURRENCY(kpi?.receivables.overdue ?? 0)} overdue`}
          icon={<TrendingDown className="w-5 h-5" />}
          loading={loading}
          format="currency"
        />
        <KPICard
          title="Outstanding Debt"
          value={kpi?.debt.current ?? 0}
          trendLabel={`EMI ${CURRENCY(kpi?.debt.upcomingEmi ?? 0)}${kpi?.debt.nextEmiDate ? ` due ${kpi.debt.nextEmiDate}` : ''}`}
          icon={<Banknote className="w-5 h-5" />}
          loading={loading}
          format="currency"
        />
      </div>

      {/* Financial health score + revenue vs expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-6 flex flex-col items-center justify-center text-center" hover>
          <h3 className="text-base font-semibold text-slate-900 mb-4 self-start">Financial Health Score</h3>
          <ScoreRing score={kpi?.healthScore.score ?? 0} size={160} stroke={12} label={kpi?.healthScore.label ?? ''} color={healthColor} />
          <p className="text-xs text-slate-500 mt-4 max-w-[220px]">
            Based on profitability, cash flow, debt and liquidity factors
          </p>
          <Link to="/financial-health" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition">
            View details <ArrowRight className="w-4 h-4" />
          </Link>
        </Card>

        <ChartCard title="Revenue vs Expenses" subtitle="Last 6 months comparison" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 100000}L`} />
              <Tooltip formatter={moneyTooltip} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue" name="Revenue" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="expenses" name="Expenses" fill="#93c5fd" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Revenue + cash flow trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Revenue Trend" subtitle="Daily revenue vs target">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={revenueTrend.data || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}K`} />
              <Tooltip formatter={moneyTooltip} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#2563eb" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="target" name="Target" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Cash Flow Trend" subtitle="Inflow vs outflow (net)">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={cashFlowTrend.data || []}>
              <defs>
                <linearGradient id="inflow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}K`} />
              <Tooltip formatter={moneyTooltip} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="inflow" name="Inflow" stroke="#10b981" fill="url(#inflow)" strokeWidth={2} />
              <Area type="monotone" dataKey="outflow" name="Outflow" stroke="#ef4444" fill="transparent" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Expense distribution + receivables aging */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Expense Distribution" subtitle="By category">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={expenseDist.data || []} dataKey="amount" nameKey="category" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {(expenseDist.data || []).map((_, idx) => (
                  <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={moneyTooltip} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Receivables Aging" subtitle="Outstanding amount by age bracket">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={aging.data || []} layout="vertical" barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}K`} />
              <YAxis type="category" dataKey="bracket" width={80} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={moneyTooltip} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Bar dataKey="amount" name="Amount" radius={[0, 4, 4, 0]} maxBarSize={22}>
                {(aging.data || []).map((entry, idx) => (
                  <Cell key={idx} fill={entry.color || PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* 30-day forecast + loan overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="30-Day Cash Flow Forecast" subtitle="Projected cash balance" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={forecastData}>
              <defs>
                <linearGradient id="forecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval={3} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 100000}L`} />
              <Tooltip formatter={moneyTooltip} labelFormatter={(l) => `Date: ${l}`} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="balance" name="Projected Balance" stroke="#2563eb" fill="url(#forecast)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card className="p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Loan / Debt Overview</h3>
          <div className="space-y-4">
            {loanOverview.length === 0 && !loans.isLoading && <p className="text-sm text-slate-400">No active loans.</p>}
            {loanOverview.map((loan) => (
              <div key={loan.name} className="p-3 rounded-lg bg-slate-50">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-medium text-slate-700 truncate">{loan.name}</span>
                  <span className="text-xs text-slate-500 whitespace-nowrap">{loan.progress}% paid</span>
                </div>
                <div className="w-full bg-white rounded-full h-2 mb-2 overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500 transition-all duration-700" style={{ width: `${loan.progress}%` }} />
                </div>
                <p className="text-xs text-slate-500">
                  Outstanding <span className="font-semibold text-slate-700">{CURRENCY(loan.outstanding)}</span> · EMI {CURRENCY(loan.emi)}
                </p>
              </div>
            ))}
          </div>
          <Link to="/loans" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition">
            Manage loans <ArrowRight className="w-4 h-4" />
          </Link>
        </Card>
      </div>

      {/* Risk alert strip */}
      <Card className="p-4 border-l-4 border-l-amber-500 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm text-slate-700">
            {risk.data && risk.data.summary.active_risks > 0 ? (
              <>
                <span className="font-semibold">{risk.data.summary.active_risks} active risks</span> require attention
                {topRisk ? <> — including “{topRisk.title.toLowerCase()}”.</> : '.'}
              </>
            ) : (
              <span className="font-semibold">No significant risks</span>
            )}
          </p>
        </div>
        <Link to="/risk-analysis" className="shrink-0 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition">
          Review <ArrowRight className="w-4 h-4" />
        </Link>
      </Card>
    </div>
  );
}
