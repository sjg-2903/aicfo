import apiClient from '@/lib/axios';

/**
 * Loan Readiness Service
 * 
 * API Documentation:
 * - GET /api/loan-readiness - Get loan readiness assessment
 * - GET /api/loan-readiness/factors - Get detailed readiness factors
 */

export interface LoanReadinessFactor {
  name: string;
  score: number;
  weight: number;
  contribution: number;
  status: 'strong' | 'moderate' | 'weak';
  recommendation?: string;
}

export interface LoanReadiness {
  readiness_score: number;
  status: 'ready' | 'moderate' | 'not_ready';
  overall_recommendation: string;
  factors: LoanReadinessFactor[];
  improvement_suggestions: string[];
  last_updated: string;
}

class LoanReadinessService {
  async getLoanReadiness(): Promise<LoanReadiness> {
    const response = await apiClient.get('/api/loan-readiness');
    return response.data;
  }

  async getReadinessFactors(): Promise<LoanReadinessFactor[]> {
    const response = await apiClient.get('/api/loan-readiness/factors');
    return response.data;
  }
}

export default new LoanReadinessService();
