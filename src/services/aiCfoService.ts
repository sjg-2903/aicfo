import apiClient from '@/lib/axios';

/**
 * AI CFO Service — backed by FastAPI
 *  - POST /api/ai-cfo/chat
 *  - POST /api/ai-cfo/analyze
 *  - POST /api/ai-cfo/recommend
 */

export interface ChatReply {
  sessionId: string;
  content: string;
  engine: string;
  followUps: string[];
}

export interface AnalyzeResult {
  narrative: string;
  metrics: Record<string, unknown>;
  financialHealth: { score: number; label: string };
  risk: { risk_score: number; risk_level: string; risks: unknown[] };
  loanReadiness: { readiness_score: number; label: string };
}

class AICFOService {
  async sendMessage(message: string, sessionId?: string): Promise<ChatReply> {
    const response = await apiClient.post('/api/ai-cfo/chat', {
      message,
      ...(sessionId ? { session_id: sessionId } : {}),
    });
    const r = response.data as {
      session_id: string;
      engine?: string;
      suggested_follow_ups?: string[];
      message: { content: string };
    };
    return {
      sessionId: r.session_id,
      content: r.message?.content || '',
      engine: r.engine || 'deterministic',
      followUps: r.suggested_follow_ups || [],
    };
  }

  async analyze(): Promise<AnalyzeResult> {
    const response = await apiClient.post('/api/ai-cfo/analyze', {});
    return response.data as AnalyzeResult;
  }

  async recommend(): Promise<{ narrative: string; recommendations: unknown[] }> {
    const response = await apiClient.post('/api/ai-cfo/recommend', {});
    return response.data as { narrative: string; recommendations: unknown[] };
  }
}

export default new AICFOService();
