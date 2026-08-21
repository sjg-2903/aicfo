import apiClient from '@/lib/axios';

/**
 * Business Profile Service
 * 
 * API Documentation:
 * - GET /api/profile - Get business profile
 * - PUT /api/profile - Update business profile
 * - GET /api/profile/preferences - Get user preferences
 * - PUT /api/profile/preferences - Update user preferences
 */

export interface BusinessProfile {
  id: string;
  business_name: string;
  business_type: string;
  industry: string;
  gstin?: string;
  pan?: string;
  incorporation_date?: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  website?: string;
  founded_year?: number;
  employee_count?: number;
  annual_turnover?: number;
  currency: string;
  fiscal_year_start?: string;
}

export interface UserPreferences {
  id: string;
  timezone: string;
  date_format: string;
  currency: string;
  number_format: string;
  language: string;
  theme: 'light' | 'dark';
  notifications_enabled: boolean;
  email_digest_frequency: 'daily' | 'weekly' | 'monthly' | 'never';
  risk_alert_threshold: 'low' | 'medium' | 'high' | 'critical';
}

export interface ProfileUpdateRequest extends Partial<BusinessProfile> {}

export interface PreferencesUpdateRequest extends Partial<UserPreferences> {}

class ProfileService {
  async getProfile(): Promise<BusinessProfile> {
    const response = await apiClient.get('/api/profile');
    return response.data;
  }

  async updateProfile(data: ProfileUpdateRequest): Promise<BusinessProfile> {
    const response = await apiClient.put('/api/profile', data);
    return response.data;
  }

  async getPreferences(): Promise<UserPreferences> {
    const response = await apiClient.get('/api/profile/preferences');
    return response.data;
  }

  async updatePreferences(data: PreferencesUpdateRequest): Promise<UserPreferences> {
    const response = await apiClient.put('/api/profile/preferences', data);
    return response.data;
  }
}

export default new ProfileService();
