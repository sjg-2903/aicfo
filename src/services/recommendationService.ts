import apiClient from '@/lib/axios';
import { mapRecommendation, type RecommendationRow } from '@/lib/mappers';

/**
 * Recommendation Service — backed by FastAPI
 *  - GET  /api/recommendations
 *  - POST /api/recommendations/generate
 *  - PUT  /api/recommendations/{id}/acknowledge | /complete | /dismiss
 */

const LIMIT = 500;

class RecommendationService {
  async getRecommendations(): Promise<RecommendationRow[]> {
    const response = await apiClient.get('/api/recommendations', { params: { page: 1, limit: LIMIT } });
    const rows: unknown[] = Array.isArray(response.data) ? response.data : [];
    return rows.map((r) => mapRecommendation(r as Parameters<typeof mapRecommendation>[0]));
  }

  async generate(): Promise<RecommendationRow[]> {
    const response = await apiClient.post('/api/recommendations/generate', {});
    const rows: unknown[] = Array.isArray(response.data) ? response.data : [];
    return rows.map((r) => mapRecommendation(r as Parameters<typeof mapRecommendation>[0]));
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
}

export default new RecommendationService();
