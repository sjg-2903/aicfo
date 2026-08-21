import apiClient from '@/lib/axios';

/**
 * Alert Service
 * 
 * API Documentation:
 * - GET /api/alerts - Get alerts with filtering
 * - GET /api/alerts/{id} - Get alert details
 * - PUT /api/alerts/{id}/read - Mark alert as read
 * - DELETE /api/alerts/{id} - Dismiss alert
 */

export type AlertSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  type: string;
  related_entity_type?: string;
  related_entity_id?: string;
  is_read: boolean;
  action_url?: string;
  created_at: string;
  expires_at?: string;
}

export interface AlertListResponse {
  data: Alert[];
  total: number;
  unread_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AlertFilter {
  severity?: AlertSeverity;
  type?: string;
  is_read?: boolean;
}

class AlertService {
  async getAlerts(
    page: number = 1,
    page_size: number = 20,
    filters?: AlertFilter,
    sort_by: string = 'created_at',
    sort_order: 'asc' | 'desc' = 'desc'
  ): Promise<AlertListResponse> {
    const response = await apiClient.get('/api/alerts', {
      params: {
        page,
        page_size,
        ...filters,
        sort_by,
        sort_order,
      },
    });
    return response.data;
  }

  async getAlert(id: string): Promise<Alert> {
    const response = await apiClient.get(`/api/alerts/${id}`);
    return response.data;
  }

  async markAsRead(id: string): Promise<Alert> {
    const response = await apiClient.put(`/api/alerts/${id}/read`);
    return response.data;
  }

  async dismissAlert(id: string): Promise<void> {
    await apiClient.delete(`/api/alerts/${id}`);
  }
}

export default new AlertService();
