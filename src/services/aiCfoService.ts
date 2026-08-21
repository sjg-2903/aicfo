import apiClient from '@/lib/axios';

/**
 * AI CFO Service — backed by FastAPI
 *  - POST /api/ai-cfo/chat | /chat/file
 *  - POST /api/ai-cfo/images/generate
 *  - POST /api/ai-cfo/analyze | /recommend
 */

export interface ChatReply {
  sessionId: string;
  content: string;
  engine: string;
  followUps: string[];
}

export interface GeneratedImage {
  imageUrl: string;
  revisedPrompt: string;
  engine: string;
  model: string;
  mimeType: string;
}

export interface AnalyzeResult {
  narrative: string;
  metrics: Record<string, unknown>;
  financialHealth: { score: number; label: string };
  risk: { risk_score: number; risk_level: string; risks: unknown[] };
  loanReadiness: { readiness_score: number; label: string };
}

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
          });
        })()
      : await apiClient.post('/api/ai-cfo/chat', {
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

  async generateImage(prompt: string, size = '1024x1024'): Promise<GeneratedImage> {
    const response = await apiClient.post('/api/ai-cfo/images/generate', { prompt, size });
    const result = response.data as {
      image_url: string;
      revised_prompt?: string;
      engine: string;
      model: string;
      mime_type?: string;
    };
    return {
      imageUrl: result.image_url,
      revisedPrompt: result.revised_prompt || prompt,
      engine: result.engine,
      model: result.model,
      mimeType: result.mime_type || 'image/png',
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
