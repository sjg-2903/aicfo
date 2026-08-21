import apiClient from '@/lib/axios';
import { mapAlert, type AlertRow } from '@/lib/mappers';

/**
 * Alert Service — backed by FastAPI
 *  - GET   /api/alerts
 *  - PATCH /api/alerts/{id}/read
 */

const LIMIT = 500;

class AlertService {
  async getAlerts(): Promise<AlertRow[]> {
    const response = await apiClient.get('/api/alerts', { params: { page: 1, limit: LIMIT } });
    const rows: unknown[] = Array.isArray(response.data) ? response.data : [];
    return rows.map((r) => mapAlert(r as Parameters<typeof mapAlert>[0]));
  }

  async markAsRead(id: string): Promise<void> {
    await apiClient.patch(`/api/alerts/${id}/read`, { read: true });
  }
}

export default new AlertService();
