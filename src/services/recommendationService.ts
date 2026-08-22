import apiClient from '@/lib/axios';
import { mapRecommendation, type RecommendationRow } from '@/lib/mappers';

/**
 * Recommendation Service — backed by FastAPI
 *  - GET  /api/recommendations
 *  - GET  /api/recommendations/summary
 *  - POST /api/recommendations/generate
 *  - PUT  /api/recommendations/{id}/acknowledge | /complete | /dismiss
 *  - DELETE /api/recommendations/{id}
 */

const LIMIT = 500;

export const RECOMMENDATION_GENERATION_PROMPT =
  'Give me recommendations on my data analysis which contains the whole finance section like invoices, cash flow, GST, loans, expenses and transactions in the schema as defined in the recommendations display.';

export interface SummaryBullets {
  generatedAt: string;
  engine: string;
  bullets: string[];
}

export interface GenerateResult {
  recommendations: RecommendationRow[];
  engine: string;
  summaryBullets: string[];
  summaryEngine: string;
}

class RecommendationService {
  async getRecommendations(): Promise<RecommendationRow[]> {
    const response = await apiClient.get('/api/recommendations', { params: { page: 1, limit: LIMIT } });
    const rows: unknown[] = Array.isArray(response.data) ? response.data : [];
    return rows.map((r) => mapRecommendation(r as Parameters<typeof mapRecommendation>[0]));
  }

  async generate(prompt = RECOMMENDATION_GENERATION_PROMPT): Promise<GenerateResult> {
    const response = await apiClient.post('/api/recommendations/generate', { prompt });
    const d = response.data as {
      recommendations?: unknown[];
      engine?: string;
      summary_bullets?: string[];
      summary_engine?: string;
    };
    // Support both the new shape (object with recommendations + bullets) and
    // the old shape (bare array) for backwards compatibility.
    const rows: unknown[] = Array.isArray(d?.recommendations)
      ? d.recommendations
      : Array.isArray(response.data)
        ? response.data
        : [];
    return {
      recommendations: rows.map((r) => mapRecommendation(r as Parameters<typeof mapRecommendation>[0])),
      engine: d?.engine || 'deterministic',
      summaryBullets: Array.isArray(d?.summary_bullets) ? d.summary_bullets : [],
      summaryEngine: d?.summary_engine || 'deterministic',
    };
  }

  async getSummary(): Promise<SummaryBullets> {
    const response = await apiClient.get('/api/recommendations/summary');
    const d = response.data as {
      generated_at: string;
      engine: string;
      bullets: string[];
    };
    return {
      generatedAt: d.generated_at,
      engine: d.engine,
      bullets: Array.isArray(d.bullets) ? d.bullets : [],
    };
  }


  async acknowledge(id: string): Promise<void> {
    await apiClient.put(`/api/recommendations/${id}/acknowledge`);
  }

  async complete(id: string): Promise<void> {
    await apiClient.put(`/api/recommendations/${id}/complete`);
  }

  async dismiss(id: string): Promise<void> {
    await apiClient.put(`/api/recommendations/${id}/dismiss`);
  }

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/api/recommendations/${id}`);
  }
}

export default new RecommendationService();
