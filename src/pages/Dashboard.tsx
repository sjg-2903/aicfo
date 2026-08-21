import { Link } from 'react-router-dom';
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
import { Card, ChartCard, PageHeader, ScoreRing } from '@/components/ui';
import { CURRENCY, moneyTooltip } from '@/lib/format';
import {
  mockKpiSummary,
  mockRevenueVsExpenses,
  mockRevenueTrend,
  mockCashFlowTrend,
  mockCashFlowForecast,
  mockExpenseDistribution,
  mockReceivablesAging,
  mockLoanOverview,
  mockHealthScore,
} from '@/mock';

const PIE_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#f97316', '#8b5cf6', '#64748b'];

export default function Dashboard() {
  const healthColor =
    mockHealthScore.score >= 75 ? '#10b981' : mockHealthScore.score >= 55 ? '#f59e0b' : '#ef4444';

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
        <KPICard
          title="Revenue"
          value={mockKpiSummary.revenue.current}
          trend={mockKpiSummary.revenue.change}
          trendLabel={mockKpiSummary.revenue.label}
          icon={<TrendingUp className="w-5 h-5" />}
          format="currency"
        />
        <KPICard
          title="Expenses"
          value={mockKpiSummary.expenses.current}
          trend={mockKpiSummary.expenses.change}
          trendLabel={mockKpiSummary.expenses.label}
          icon={<Receipt className="w-5 h-5" />}
          format="currency"
        />
        <KPICard
          title="Net Profit"
          value={mockKpiSummary.netProfit.current}
          trend={mockKpiSummary.netProfit.change}
          trendLabel={mockKpiSummary.netProfit.label}
          icon={<IndianRupee className="w-5 h-5" />}
          format="currency"
        />
        <KPICard
          title="Cash Balance"
          value={mockKpiSummary.cashBalance.current}
          trend={mockKpiSummary.cashBalance.change}
          trendLabel={mockKpiSummary.cashBalance.label}
          icon={<Wallet className="w-5 h-5" />}
          format="currency"
        />
        <KPICard
          title="Outstanding Receivables"
          value={mockKpiSummary.receivables.current}
          trend={mockKpiSummary.receivables.change}
          trendLabel={`${CURRENCY(mockKpiSummary.receivables.overdue)} overdue`}
          icon={<TrendingDown className="w-5 h-5" />}
          format="currency"
        />
        <KPICard
          title="Outstanding Debt"
          value={mockKpiSummary.debt.current}
          trend={mockKpiSummary.debt.change}
          trendLabel={`EMI ${CURRENCY(mockKpiSummary.debt.upcomingEmi)} due ${mockKpiSummary.debt.nextEmiDate}`}
          icon={<Banknote className="w-5 h-5" />}
          format="currency"
        />
      </div>

      {/* Financial health score + revenue vs expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-6 flex flex-col items-center justify-center text-center" hover>
          <h3 className="text-base font-semibold text-slate-900 mb-4 self-start">Financial Health Score</h3>
          <ScoreRing score={mockHealthScore.score} size={160} stroke={12} label="Good" color={healthColor} />
          <p className="text-xs text-slate-500 mt-4 max-w-[220px]">
            Based on profitability, cash flow, debt and liquidity factors
          </p>
          <Link
            to="/financial-health"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition"
          >
            View details <ArrowRight className="w-4 h-4" />
          </Link>
        </Card>

        <ChartCard
          title="Revenue vs Expenses"
          subtitle="Last 6 months comparison"
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={mockRevenueVsExpenses} barGap={4}>
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
            <LineChart data={mockRevenueTrend}>
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
            <AreaChart data={mockCashFlowTrend}>
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
        <ChartCard title="Expense Distribution" subtitle="By category (30 days)">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={mockExpenseDistribution}
                dataKey="amount"
                nameKey="category"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
              >
                {mockExpenseDistribution.map((_, idx) => (
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
            <BarChart data={mockReceivablesAging} layout="vertical" barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}K`} />
              <YAxis type="category" dataKey="bracket" width={80} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={moneyTooltip} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Bar dataKey="amount" name="Amount" radius={[0, 4, 4, 0]} maxBarSize={22}>
                {mockReceivablesAging.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* 30-day forecast + loan overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          title="30-Day Cash Flow Forecast"
          subtitle="Historical vs predicted balance"
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={mockCashFlowForecast}>
              <defs>
                <linearGradient id="forecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval={3} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 100000}L`} />
              <Tooltip
                formatter={moneyTooltip}
                labelFormatter={(l) => `Date: ${l}`}
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="balance" name="Cash Balance" stroke="#2563eb" fill="url(#forecast)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card className="p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Loan / Debt Overview</h3>
          <div className="space-y-4">
            {mockLoanOverview.map((loan) => (
              <div key={loan.name} className="p-3 rounded-lg bg-slate-50">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-medium text-slate-700 truncate">{loan.name}</span>
                  <span className="text-xs text-slate-500 whitespace-nowrap">{loan.progress}% paid</span>
                </div>
                <div className="w-full bg-white rounded-full h-2 mb-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-700"
                    style={{ width: `${loan.progress}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Outstanding <span className="font-semibold text-slate-700">{CURRENCY(loan.outstanding)}</span> · EMI {CURRENCY(loan.emi)}
                </p>
              </div>
            ))}
          </div>
          <Link
            to="/loans"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition"
          >
            Manage loans <ArrowRight className="w-4 h-4" />
          </Link>
        </Card>
      </div>

      {/* Risk alert strip */}
      <Card className="p-4 border-l-4 border-l-amber-500 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm text-slate-700">
            <span className="font-semibold">3 active risks</span> require attention — including a potential cash shortage in 45 days.
          </p>
        </div>
        <Link to="/risk-analysis" className="shrink-0 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition">
          Review <ArrowRight className="w-4 h-4" />
        </Link>
      </Card>
    </div>
  );
}
