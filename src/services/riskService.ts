import apiClient from '@/lib/axios';
import { mapRisk, type RiskRow } from '@/lib/mappers';

/**
 * Risk Service — backed by FastAPI
 *  - GET /api/risk
 *  - POST /api/risk/analyze
 *  - PUT /api/risk/{id}/acknowledge
 *  - PUT /api/risk/{id}/resolve
 */

export interface RiskView {
  score: number;
  level: string;
  risks: RiskRow[];
  summary: { active_risks: number; high_or_critical: number; health_score: number };
}

class RiskService {
  async getAssessment(): Promise<RiskView> {
    const response = await apiClient.get('/api/risk');
    return this._map(response.data);
  }

  async analyze(): Promise<RiskView> {
    const response = await apiClient.post('/api/risk/analyze', {});
    return this._map(response.data);
  }

  async acknowledgeRisk(id: string): Promise<void> {
    await apiClient.put(`/api/risk/${id}/acknowledge`);
  }

  async resolveRisk(id: string): Promise<void> {
    await apiClient.put(`/api/risk/${id}/resolve`);
  }

  private _map(raw: {
    risk_score: number;
    risk_level: string;
    risks: unknown[];
    summary?: { active_risks: number; high_or_critical: number; health_score: number };
    generated_at?: string;
  }): RiskView {
    return {
      score: raw.risk_score,
      level: raw.risk_level,
      risks: (raw.risks || []).map((r) => mapRisk(r as Parameters<typeof mapRisk>[0], raw.generated_at)),
      summary: raw.summary || { active_risks: 0, high_or_critical: 0, health_score: 0 },
    };
  }
}

export default new RiskService();
