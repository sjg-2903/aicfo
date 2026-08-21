import apiClient from '@/lib/axios';

/**
 * Dashboard Service
 * 
 * API Documentation:
 * - GET /api/dashboard/summary - Get dashboard KPI summary
 * - GET /api/dashboard/revenue-trend - Get revenue trend data
 * - GET /api/dashboard/cash-flow-trend - Get cash flow trend
 * - GET /api/dashboard/expense-distribution - Get expense distribution
 * - GET /api/dashboard/receivables-aging - Get receivables aging
 * - GET /api/dashboard/loan-overview - Get loan/debt overview
 * - GET /api/dashboard/forecast-30day - Get 30-day cash flow forecast
 * - GET /api/dashboard/financial-health-score - Get financial health score
 */

export interface KPISummary {
  revenue: {
    current: number;
    trend: number;
    comparison_period: string;
  };
  expenses: {
    current: number;
    trend: number;
    comparison_period: string;
  };
  net_profit: {
    current: number;
    trend: number;
    comparison_period: string;
  };
  cash_balance: {
    current: number;
    trend: number;
    comparison_period: string;
  };
  outstanding_receivables: {
    current: number;
    trend: number;
    overdue_amount: number;
  };
  outstanding_debt: {
    current: number;
    upcoming_emi: number;
    next_emi_date: string;
  };
}

export interface RevenueTrendPoint {
  date: string;
  revenue: number;
  target?: number;
}

export interface CashFlowTrendPoint {
  date: string;
  inflow: number;
  outflow: number;
  net_flow: number;
}

export interface ExpenseCategory {
  category: string;
  amount: number;
  percentage: number;
}

export interface ReceivableAge {
  age_bracket: string;
  count: number;
  amount: number;
}

export interface LoanOverview {
  total_loans: number;
  total_outstanding: number;
  total_emi_monthly: number;
  loans: Array<{
    id: string;
    name: string;
    outstanding: number;
    emi: number;
  }>;
}

export interface CashFlowForecastPoint {
  date: string;
  type: 'historical' | 'predicted';
  opening_balance: number;
  inflow: number;
  outflow: number;
  closing_balance: number;
  confidence?: number;
}

export interface FinancialHealthScore {
  score: number;
  status: 'good' | 'moderate' | 'at_risk' | 'critical';
  factors: Array<{
    name: string;
    weight: number;
    contribution: number;
  }>;
}

class DashboardService {
  async getKPISummary(): Promise<KPISummary> {
    const response = await apiClient.get('/api/dashboard/summary');
    return response.data;
  }

  async getRevenueTrend(days: number = 30): Promise<RevenueTrendPoint[]> {
    const response = await apiClient.get('/api/dashboard/revenue-trend', {
      params: { days },
    });
    return response.data;
  }

  async getCashFlowTrend(days: number = 30): Promise<CashFlowTrendPoint[]> {
    const response = await apiClient.get('/api/dashboard/cash-flow-trend', {
      params: { days },
    });
    return response.data;
  }

  async getExpenseDistribution(days: number = 30): Promise<ExpenseCategory[]> {
    const response = await apiClient.get('/api/dashboard/expense-distribution', {
      params: { days },
    });
    return response.data;
  }

  async getReceivablesAging(): Promise<ReceivableAge[]> {
    const response = await apiClient.get('/api/dashboard/receivables-aging');
    return response.data;
  }

  async getLoanOverview(): Promise<LoanOverview> {
    const response = await apiClient.get('/api/dashboard/loan-overview');
    return response.data;
  }

  async getCashFlowForecast(days: number = 30): Promise<CashFlowForecastPoint[]> {
    const response = await apiClient.get('/api/dashboard/forecast-30day', {
      params: { days },
    });
    return response.data;
  }

  async getFinancialHealthScore(): Promise<FinancialHealthScore> {
    const response = await apiClient.get('/api/dashboard/financial-health-score');
    return response.data;
  }
}

export default new DashboardService();
