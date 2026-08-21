import apiClient from '@/lib/axios';

/**
 * Financial Forecast Service
 * 
 * API Documentation:
 * - GET /api/forecast/cash-flow - Get cash flow forecast
 * - GET /api/forecast/revenue - Get revenue forecast
 * - GET /api/forecast/expense - Get expense forecast
 * - GET /api/forecast/parameters - Get forecast parameters and confidence
 */

export interface CashFlowForecast {
  date: string;
  type: 'historical' | 'predicted';
  opening_balance: number;
  inflow: number;
  outflow: number;
  closing_balance: number;
  confidence?: number;
}

export interface RevenueForecast {
  date: string;
  actual?: number;
  predicted: number;
  confidence?: number;
}

export interface ExpenseForecast {
  date: string;
  actual?: number;
  predicted: number;
  confidence?: number;
}

export interface ForecastParameters {
  forecast_period_days: number;
  model_type: string;
  last_training_date: string;
  confidence_level: number;
  risk_factor: number;
}

class ForecastService {
  async getCashFlowForecast(days: number = 30): Promise<CashFlowForecast[]> {
    const response = await apiClient.get('/api/forecast/cash-flow', {
      params: { days },
    });
    return response.data;
  }

  async getRevenueForecast(days: number = 30): Promise<RevenueForecast[]> {
    const response = await apiClient.get('/api/forecast/revenue', {
      params: { days },
    });
    return response.data;
  }

  async getExpenseForecast(days: number = 30): Promise<ExpenseForecast[]> {
    const response = await apiClient.get('/api/forecast/expense', {
      params: { days },
    });
    return response.data;
  }

  async getForecastParameters(): Promise<ForecastParameters> {
    const response = await apiClient.get('/api/forecast/parameters');
    return response.data;
  }
}

export default new ForecastService();
