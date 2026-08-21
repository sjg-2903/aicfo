import apiClient from '@/lib/axios';
import type { ForecastView } from './dashboardService';

/**
 * Financial Forecast Service — backed by FastAPI
 *  - GET  /api/forecast/cashflow
 *  - POST /api/forecast/generate
 */

class ForecastService {
  async getCashFlowForecast(): Promise<ForecastView> {
    const response = await apiClient.get('/api/forecast/cashflow');
    return this._map(response.data);
  }

  async generate(days = 30): Promise<ForecastView> {
    const response = await apiClient.post('/api/forecast/generate', { days });
    return this._map(response.data);
  }

  private _map(raw: {
    model: string;
    confidence: string;
    note?: string;
    summary: { predicted_total_inflow: number; predicted_total_outflow: number; predicted_net_cash_flow: number; min_daily_net: number };
    forecast: { date: string; predicted_inflow: number; predicted_outflow: number; predicted_net_cash_flow: number; lower_bound: number; upper_bound: number; confidence: number }[];
  }): ForecastView {
    return {
      model: raw.model,
      confidence: raw.confidence,
      note: raw.note || '',
      points: (raw.forecast || []).map((p) => ({
        date: String(p.date).slice(0, 10),
        predictedInflow: p.predicted_inflow,
        predictedOutflow: p.predicted_outflow,
        predictedNet: p.predicted_net_cash_flow,
        lower: p.lower_bound,
        upper: p.upper_bound,
        confidence: p.confidence,
      })),
      summary: {
        totalInflow: raw.summary?.predicted_total_inflow ?? 0,
        totalOutflow: raw.summary?.predicted_total_outflow ?? 0,
        netCashFlow: raw.summary?.predicted_net_cash_flow ?? 0,
        minDailyNet: raw.summary?.min_daily_net ?? 0,
      },
    };
  }
}

export default new ForecastService();
