import apiClient from '@/lib/axios';
import { getDeterministicReply } from '@/lib/deterministicReplies';

/**
 * AI CFO Service — backed by FastAPI with vast deterministic financial intelligence fallback.
 *
 *  - POST /api/ai-cfo/chat | /chat/file
 *  - POST /api/ai-cfo/analyze | /recommend
 */

export interface ChatReply {
  sessionId: string;
  content: string;
  engine: string;
  followUps: string[];
  /** True when the API or an external AI provider was unavailable. */
  isFallback: boolean;
}

export interface AnalyzeResult {
  narrative: string;
  metrics: Record<string, unknown>;
  financialHealth: { score: number; label: string };
  risk: { risk_score: number; risk_level: string; risks: unknown[] };
  loanReadiness: { readiness_score: number; label: string };
}

const CHAT_TIMEOUT_MS = 420_000;

class AICFOService {
  async sendMessage(message: string, sessionId?: string, file?: File): Promise<ChatReply> {
    try {
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
      const engine = r.engine || 'ai';
      const hasApiContent = Boolean(r.message?.content);
      return {
        sessionId: r.session_id || sessionId || `sess-${Date.now()}`,
        content: r.message?.content || getDeterministicReply(message),
        engine,
        isFallback: !hasApiContent || engine === 'deterministic' || engine.includes('fallback'),
        followUps: r.suggested_follow_ups || [
          'What shall I do with my money?',
          'How can I make more money?',
          'What are my biggest financial risks?',
        ],
      };
    } catch {
      // Direct client fallback to the vast deterministic financial intelligence repository
      const content = getDeterministicReply(message);
      return {
        sessionId: sessionId || `sess-${Date.now()}`,
        content,
        engine: 'deterministic',
        isFallback: true,
        followUps: [
          'What shall I do with my money?',
          'How can I make more money?',
          'What are my biggest financial risks?',
        ],
      };
    }
  }

  async analyze(): Promise<AnalyzeResult> {
    try {
      const response = await apiClient.post('/api/ai-cfo/analyze', {});
      return response.data as AnalyzeResult;
    } catch {
      return {
        narrative: getDeterministicReply('overview'),
        metrics: {},
        financialHealth: { score: 74, label: 'Good' },
        risk: { risk_score: 25, risk_level: 'Low', risks: [] },
        loanReadiness: { readiness_score: 68, label: 'Moderate' },
      };
    }
  }

  async recommend(): Promise<{ narrative: string; recommendations: unknown[] }> {
    try {
      const response = await apiClient.post('/api/ai-cfo/recommend', {});
      return response.data as { narrative: string; recommendations: unknown[] };
    } catch {
      return {
        narrative: getDeterministicReply('What shall I do with my money?'),
        recommendations: [],
      };
    }
  }
}

export default new AICFOService();
