import apiClient from '@/lib/axios';

/**
 * AI CFO Service — backed by FastAPI.
 * Grok is invoked only by the backend for grounded explanations and chat; the
 * browser never receives or stores an xAI key.
 *
 *  - POST /api/ai-cfo/chat | /chat/file
 *  - POST /api/ai-cfo/analyze | /recommend
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

// The backend may make several bounded Grok attempts before returning a
// deterministic fallback, so the browser timeout must outlive that server-side
// resilience window.
const CHAT_TIMEOUT_MS = 420_000;

class AICFOService {
  async sendMessage(message: string, sessionId?: string, file?: File): Promise<ChatReply> {
    const response = file
      ? await (() => {
          const formData = new FormData();
          formData.append('message', message);
          if (sessionId) formData.append('session_id', sessionId);
          formData.append('file', file);
          return apiClient.post('/api/ai-cfo/chat/file', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: CHAT_TIMEOUT_MS,
          });
        })()
      : await apiClient.post(
          '/api/ai-cfo/chat',
          {
            message,
            ...(sessionId ? { session_id: sessionId } : {}),
          },
          { timeout: CHAT_TIMEOUT_MS }
        );
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
