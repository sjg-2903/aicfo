import apiClient from '@/lib/axios';

/**
 * Recommendation Service
 * 
 * API Documentation:
 * - GET /api/recommendations - Get recommendations with filtering
 * - GET /api/recommendations/{id} - Get recommendation details
 * - PUT /api/recommendations/{id}/acknowledge - Acknowledge recommendation
 * - PUT /api/recommendations/{id}/complete - Mark recommendation as completed
 * - PUT /api/recommendations/{id}/dismiss - Dismiss recommendation
 */

export type RecommendationPriority = 'low' | 'medium' | 'high' | 'critical';
export type RecommendationStatus = 'new' | 'acknowledged' | 'in_progress' | 'completed' | 'dismissed';

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  reason: string;
  priority: RecommendationPriority;
  status: RecommendationStatus;
  recommended_action: string;
  expected_impact: string;
  impact_value?: number;
  source_agent: string;
  category: string;
  created_at: string;
  completed_at?: string;
}

export interface RecommendationListResponse {
  data: Recommendation[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface RecommendationFilter {
  priority?: RecommendationPriority;
  status?: RecommendationStatus;
  source_agent?: string;
  category?: string;
}

class RecommendationService {
  async getRecommendations(
    page: number = 1,
    page_size: number = 20,
    filters?: RecommendationFilter,
    sort_by: string = 'created_at',
    sort_order: 'asc' | 'desc' = 'desc'
  ): Promise<RecommendationListResponse> {
    const response = await apiClient.get('/api/recommendations', {
      params: {
        page,
        page_size,
        ...filters,
        sort_by,
        sort_order,
      },
    });
    return response.data;
  }

  async getRecommendation(id: string): Promise<Recommendation> {
    const response = await apiClient.get(`/api/recommendations/${id}`);
    return response.data;
  }

  async acknowledgeRecommendation(id: string): Promise<Recommendation> {
    const response = await apiClient.put(`/api/recommendations/${id}/acknowledge`);
    return response.data;
  }

  async completeRecommendation(id: string): Promise<Recommendation> {
    const response = await apiClient.put(`/api/recommendations/${id}/complete`);
    return response.data;
  }

  async dismissRecommendation(id: string): Promise<Recommendation> {
    const response = await apiClient.put(`/api/recommendations/${id}/dismiss`);
    return response.data;
  }
}

export default new RecommendationService();
