import apiClient from '@/lib/axios';
import { mapLoanReadiness, type LoanReadinessView } from '@/lib/mappers';

/**
 * Loan Readiness Service — backed by FastAPI
 *  - GET  /api/loan-readiness
 *  - POST /api/loan-readiness/analyze
 */

class LoanReadinessService {
  async getLoanReadiness(): Promise<LoanReadinessView> {
    const response = await apiClient.get('/api/loan-readiness');
    return mapLoanReadiness(response.data as Parameters<typeof mapLoanReadiness>[0]);
  }

  async analyze(): Promise<LoanReadinessView> {
    const response = await apiClient.post('/api/loan-readiness/analyze', {});
    return mapLoanReadiness(response.data as Parameters<typeof mapLoanReadiness>[0]);
  }
}

export default new LoanReadinessService();
