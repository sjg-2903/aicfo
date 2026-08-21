import apiClient from '@/lib/axios';
import { mapRecommendation, type RecommendationRow } from '@/lib/mappers';

/**
 * Recommendation Service — backed by FastAPI
 *  - GET  /api/recommendations
 *  - POST /api/recommendations/generate
 *  - PUT  /api/recommendations/{id}/acknowledge | /complete | /dismiss
 *  - DELETE /api/recommendations/{id}
 */

export interface DashboardRecommendationRow {
  id: string;
  title: string;
  description: string;
  action: string;
  impact: string;
  priority: string;
  category: string;
  sourceAgent: string;
  date: string;
}

export interface DashboardRecommendations {
  generatedAt: string;
  engine: string;
  narrative: string | null;
  recommendations: DashboardRecommendationRow[];
}

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

  async getDashboardRecommendations(): Promise<DashboardRecommendations> {
    const response = await apiClient.get('/api/recommendations/dashboard', { params: { limit: 6 } });
    const r = response.data as {
      generated_at: string;
      engine: string;
      narrative: string | null;
      recommendations: {
        rid?: string;
        title: string;
        description: string;
        recommended_action: string;
        expected_impact?: string;
        impact_value?: number;
        priority: string;
        category: string;
        source_agent: string;
        created_at: string;
      }[];
    };
    return {
      generatedAt: r.generated_at,
      engine: r.engine,
      narrative: r.narrative,
      recommendations: (r.recommendations || []).map((rec) => ({
        id: rec.rid || `${rec.category}-${rec.title}`,
        title: rec.title,
        description: rec.description,
        action: rec.recommended_action || rec.description,
        impact: rec.expected_impact || '',
        priority: rec.priority,
        category: rec.category,
        sourceAgent: rec.source_agent,
        date: rec.created_at ? String(rec.created_at).slice(0, 10) : '',
      })),
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
