import apiClient from '@/lib/axios';

/**
 * AI CFO Service
 * 
 * API Documentation:
 * - POST /api/ai-cfo/chat - Send message to AI CFO
 * - GET /api/ai-cfo/conversation - Get conversation history
 * - DELETE /api/ai-cfo/conversation - Clear conversation history
 * - GET /api/ai-cfo/suggested-questions - Get suggested questions
 */

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  thinking?: string;
  sources?: Array<{
    type: string;
    reference: string;
  }>;
}

export interface AIChatRequest {
  message: string;
  context?: Record<string, unknown>;
}

export interface AIChatResponse {
  message: AIMessage;
  suggested_follow_ups?: string[];
  insights?: Array<{
    type: string;
    title: string;
    description: string;
  }>;
}

export interface ConversationHistory {
  messages: AIMessage[];
  total_messages: number;
  created_at: string;
}

export interface SuggestedQuestion {
  question: string;
  category: string;
  icon?: string;
}

class AICFOService {
  async sendMessage(request: AIChatRequest): Promise<AIChatResponse> {
    const response = await apiClient.post('/api/ai-cfo/chat', request);
    return response.data;
  }

  async getConversationHistory(): Promise<ConversationHistory> {
    const response = await apiClient.get('/api/ai-cfo/conversation');
    return response.data;
  }

  async clearConversation(): Promise<void> {
    await apiClient.delete('/api/ai-cfo/conversation');
  }

  async getSuggestedQuestions(): Promise<SuggestedQuestion[]> {
    const response = await apiClient.get('/api/ai-cfo/suggested-questions');
    return response.data;
  }
}

export default new AICFOService();
