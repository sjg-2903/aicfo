import apiClient from '@/lib/axios';

/**
 * History Service — unified activity timeline.
 *  - GET /api/history?page=&limit=&event_type=&status=&search=
 */

export type HistoryEventType =
  | 'upload'
  | 'extraction'
  | 'import'
  | 'report'
  | 'recommendations'
  | 'record';

export interface HistoryEvent {
  id: string;
  event_type: HistoryEventType;
  entity: string | null;
  action: string | null;
  status: 'success' | 'partial' | 'failed';
  message: string | null;
  details: Record<string, unknown>;
  report_id: string | null;
  created_at: string;
  source: 'history' | 'audit';
}

export interface HistoryQuery {
  page?: number;
  limit?: number;
  eventType?: string;
  status?: string;
  search?: string;
}

export interface HistoryPage {
  items: HistoryEvent[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

class HistoryService {
  async getHistory(query: HistoryQuery = {}): Promise<HistoryPage> {
    const params: Record<string, string | number> = {
      page: query.page || 1,
      limit: query.limit || 20,
    };
    if (query.eventType && query.eventType !== 'all') params.event_type = query.eventType;
    if (query.status && query.status !== 'all') params.status = query.status;
    if (query.search) params.search = query.search;

    const response = await apiClient.get('/api/history', { params });
    const items: unknown[] = Array.isArray(response.data) ? response.data : [];
    const meta = (response.data as { _meta?: { page?: number; limit?: number; total?: number; pages?: number } })?._meta;
    return {
      items: items as HistoryEvent[],
      total: meta?.total ?? items.length,
      page: meta?.page ?? 1,
      limit: meta?.limit ?? items.length,
      pages: meta?.pages ?? 1,
    };
  }
}

export default new HistoryService();
