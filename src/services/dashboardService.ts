import apiClient from '@/lib/axios';
import { mapHealth, type HealthView } from '@/lib/mappers';

/**
 * Dashboard Service — backed by FastAPI
 *  - GET /api/dashboard/summary
 *  - GET /api/dashboard/financial-health
 *  - GET /api/dashboard/revenue-trend
 *  - GET /api/dashboard/cash-flow-trend
 *  - GET /api/dashboard/expense-distribution
 *  - GET /api/dashboard/receivables-aging
 *  - GET /api/dashboard/loan-overview
 *  - GET /api/dashboard/monthly-series
 *  - GET /api/dashboard/forecast-30day
 */

export interface KpiSummary {
  revenue: { current: number; change?: number; label?: string };
  expenses: { current: number; change?: number; label?: string };
  netProfit: { current: number; change?: number; label?: string };
  cashBalance: { current: number; change?: number; label?: string };
  receivables: { current: number; overdue: number };
  debt: { current: number; upcomingEmi: number; nextEmiDate: string };
  healthScore: { score: number; status: string; label: string };
}

export interface RevenueTrendPoint { date: string; revenue: number; target: number; }
export interface CashFlowTrendPoint { date: string; inflow: number; outflow: number; }
export interface ExpenseCategory { category: string; amount: number; percentage: number; }
export interface ReceivableAge { bracket: string; amount: number; count: number; color: string; }
export interface MonthlyPoint { month: string; revenue: number; expenses: number; netCashFlow: number; }

export interface ForecastPoint {
  date: string;
  predictedInflow: number;
  predictedOutflow: number;
  predictedNet: number;
  lower: number;
  upper: number;
  confidence: number;
}

export interface ForecastView {
  model: string;
  confidence: string;
  note: string;
  points: ForecastPoint[];
  summary: {
    totalInflow: number;
    totalOutflow: number;
    netCashFlow: number;
    minDailyNet: number;
  };
}

class DashboardService {
  async getKPISummary(): Promise<KpiSummary> {
    const response = await apiClient.get('/api/dashboard/summary');
    const s = response.data as {
      revenue: { current: number; trend?: number | null; comparison_period?: string };
      expenses: { current: number; trend?: number | null; comparison_period?: string };
      net_profit: { current: number; trend?: number | null; comparison_period?: string };
      cash_balance: { current: number };
      outstanding_receivables: { current: number; overdue_amount: number };
      outstanding_debt: { current: number; upcoming_emi: number; next_emi_date: string | null };
      health_score: { score: number; status: string; label: string };
    };
    const trend = (v: number | null | undefined) => (v === null || v === undefined ? undefined : v);
    return {
      revenue: { current: s.revenue.current, change: trend(s.revenue.trend), label: s.revenue.comparison_period || 'vs previous month' },
      expenses: { current: s.expenses.current, change: trend(s.expenses.trend), label: s.expenses.comparison_period || 'vs previous month' },
      netProfit: { current: s.net_profit.current, change: trend(s.net_profit.trend), label: s.net_profit.comparison_period || 'vs previous month' },
      cashBalance: { current: s.cash_balance.current, label: 'current balance' },
      receivables: { current: s.outstanding_receivables.current, overdue: s.outstanding_receivables.overdue_amount },
      debt: {
        current: s.outstanding_debt.current,
        upcomingEmi: s.outstanding_debt.upcoming_emi,
        nextEmiDate: s.outstanding_debt.next_emi_date ? String(s.outstanding_debt.next_emi_date).slice(0, 10) : '',
      },
      healthScore: s.health_score,
    };
  }

  async getFinancialHealth(): Promise<HealthView> {
    const response = await apiClient.get('/api/dashboard/financial-health');
    return mapHealth(response.data as Parameters<typeof mapHealth>[0]);
  }

  async getRevenueTrend(days = 30): Promise<RevenueTrendPoint[]> {
    const response = await apiClient.get('/api/dashboard/revenue-trend', { params: { days } });
    return (response.data as { date: string; revenue: number; target?: number }[]).map((r) => ({
      date: r.date,
      revenue: r.revenue,
      target: r.target ?? r.revenue,
    }));
  }

  async getCashFlowTrend(days = 30): Promise<CashFlowTrendPoint[]> {
    const response = await apiClient.get('/api/dashboard/cash-flow-trend', { params: { days } });
    return (response.data as { date: string; inflow: number; outflow: number }[]).map((r) => ({
      date: r.date,
      inflow: r.inflow,
      outflow: r.outflow,
    }));
  }

  async getExpenseDistribution(): Promise<ExpenseCategory[]> {
    const response = await apiClient.get('/api/dashboard/expense-distribution');
    return response.data as ExpenseCategory[];
  }

  async getReceivablesAging(): Promise<ReceivableAge[]> {
    const response = await apiClient.get('/api/dashboard/receivables-aging');
    return response.data as ReceivableAge[];
  }

  async getMonthlySeries(months = 6): Promise<MonthlyPoint[]> {
    const response = await apiClient.get('/api/dashboard/monthly-series', { params: { months } });
    return (response.data as { month: string; revenue: number; expenses: number; net_cash_flow: number }[]).map((r) => ({
      month: r.month,
      revenue: r.revenue,
      expenses: r.expenses,
      netCashFlow: r.net_cash_flow,
    }));
  }

  async getForecast(): Promise<ForecastView> {
    const response = await apiClient.get('/api/dashboard/forecast-30day');
    const f = response.data as {
      model: string;
      confidence: string;
      note?: string;
      summary: { predicted_total_inflow: number; predicted_total_outflow: number; predicted_net_cash_flow: number; min_daily_net: number };
      predicted_inflow: number[];
      predicted_outflow: number[];
      predicted_net_cash_flow: number[];
      lower_bound: number[];
      upper_bound: number[];
      forecast?: { date: string; predicted_inflow: number; predicted_outflow: number; predicted_net_cash_flow: number; lower_bound: number; upper_bound: number; confidence: number }[];
    };
    const points: ForecastPoint[] = (f.forecast || []).map((p) => ({
      date: String(p.date).slice(0, 10),
      predictedInflow: p.predicted_inflow,
      predictedOutflow: p.predicted_outflow,
      predictedNet: p.predicted_net_cash_flow,
      lower: p.lower_bound,
      upper: p.upper_bound,
      confidence: p.confidence,
    }));
    if (points.length === 0 && f.predicted_net_cash_flow) {
      f.predicted_net_cash_flow.forEach((net, i) => {
        points.push({
          date: '',
          predictedInflow: f.predicted_inflow[i] ?? 0,
          predictedOutflow: f.predicted_outflow[i] ?? 0,
          predictedNet: net,
          lower: f.lower_bound[i] ?? net,
          upper: f.upper_bound[i] ?? net,
          confidence: 0,
        });
      });
    }
    return {
      model: f.model,
      confidence: f.confidence,
      note: f.note || '',
      points,
      summary: {
        totalInflow: f.summary?.predicted_total_inflow ?? 0,
        totalOutflow: f.summary?.predicted_total_outflow ?? 0,
        netCashFlow: f.summary?.predicted_net_cash_flow ?? 0,
        minDailyNet: f.summary?.min_daily_net ?? 0,
      },
    };
  }
}

export default new DashboardService();
