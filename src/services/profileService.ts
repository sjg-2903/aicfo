import apiClient from '@/lib/axios';

/**
 * Business Profile Service — backed by FastAPI
 *  - GET /api/business
 *  - PUT /api/business
 */

export interface BusinessProfile {
  id: string;
  businessName: string;
  businessType: string;
  industry: string;
  gstin: string;
  pan: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  pincode: string;
  website: string;
  annualTurnover: number;
  employeeCount: number;
  currency: string;
}

export type BusinessProfileUpdate = Partial<
  Omit<BusinessProfile, 'id' | 'currency'> & Record<string, unknown>
>;

function fromRaw(raw: Record<string, unknown>): BusinessProfile {
  return {
    id: String(raw.id ?? ''),
    businessName: String(raw.business_name ?? ''),
    businessType: String(raw.business_type ?? ''),
    industry: String(raw.industry ?? ''),
    gstin: String(raw.gstin ?? ''),
    pan: String(raw.pan ?? ''),
    email: String(raw.email ?? ''),
    phone: String(raw.phone ?? ''),
    city: String(raw.city ?? ''),
    state: String(raw.state ?? ''),
    pincode: String(raw.pincode ?? ''),
    website: String(raw.website ?? ''),
    annualTurnover: Number(raw.annual_turnover ?? 0),
    employeeCount: Number(raw.employee_count ?? 0),
    currency: String(raw.currency ?? 'INR'),
  };
}

const SNAKE_KEYS: Record<string, string> = {
  businessName: 'business_name',
  businessType: 'business_type',
  annualTurnover: 'annual_turnover',
  employeeCount: 'employee_count',
};

class ProfileService {
  async getProfile(): Promise<BusinessProfile> {
    const response = await apiClient.get('/api/business');
    return fromRaw(response.data as Record<string, unknown>);
  }

  async updateProfile(data: BusinessProfileUpdate): Promise<BusinessProfile> {
    const payload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === '') continue;
      payload[SNAKE_KEYS[key] ?? key] = value;
    }
    const response = await apiClient.put('/api/business', payload);
    return fromRaw(response.data as Record<string, unknown>);
  }
}

export default new ProfileService();
