import apiClient from '@/lib/axios';

/**
 * Risk Analysis Service
 * 
 * API Documentation:
 * - GET /api/risks - Get financial risks with filtering
 * - GET /api/risks/{id} - Get risk details
 * - GET /api/risks/score - Get overall risk score
 * - PUT /api/risks/{id}/acknowledge - Mark risk as acknowledged
 * - PUT /api/risks/{id}/resolve - Mark risk as resolved
 */

export type RiskSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type RiskCategory = 'cash_flow' | 'receivables' | 'expenses' | 'debt' | 'emi' | 'gst' | 'other';
export type RiskStatus = 'active' | 'acknowledged' | 'resolved';

export interface Risk {
  id: string;
  title: string;
  description: string;
  category: RiskCategory;
  severity: RiskSeverity;
  status: RiskStatus;
  financial_impact?: number;
  evidence: string;
  recommendation: string;
  detected_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
}

export interface RiskListResponse {
  data: Risk[];
  total: number;
}

export interface RiskScore {
  overall_score: number;
  overall_level: RiskSeverity;
  categories: Array<{
    category: RiskCategory;
    score: number;
    level: RiskSeverity;
    risk_count: number;
  }>;
}

class RiskService {
  async getRisks(
    severity?: RiskSeverity,
    category?: RiskCategory,
    status?: RiskStatus
  ): Promise<RiskListResponse> {
    const response = await apiClient.get('/api/risks', {
      params: {
        ...(severity && { severity }),
        ...(category && { category }),
        ...(status && { status }),
      },
    });
    return response.data;
  }

  async getRisk(id: string): Promise<Risk> {
    const response = await apiClient.get(`/api/risks/${id}`);
    return response.data;
  }

  async getRiskScore(): Promise<RiskScore> {
    const response = await apiClient.get('/api/risks/score');
    return response.data;
  }

  async acknowledgeRisk(id: string): Promise<Risk> {
    const response = await apiClient.put(`/api/risks/${id}/acknowledge`);
    return response.data;
  }

  async resolveRisk(id: string): Promise<Risk> {
    const response = await apiClient.put(`/api/risks/${id}/resolve`);
    return response.data;
  }
}

export default new RiskService();
