import apiClient from '@/lib/axios';

/**
 * Authentication Service
 * 
 * API Documentation:
 * - POST /api/auth/register - Register a new user
 * - POST /api/auth/login - User login
 * - POST /api/auth/logout - User logout
 * - POST /api/auth/refresh - Refresh access token
 * - GET /api/auth/me - Get current user profile
 * - POST /api/auth/forgot-password - Request password reset
 * - POST /api/auth/reset-password - Reset password with token
 */

export interface RegisterRequest {
  email: string;
  password: string;
  business_name: string;
  owner_name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    business_name: string;
    owner_name: string;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  business_name: string;
  owner_name: string;
  created_at: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface PasswordResetResponse {
  message: string;
}

class AuthService {
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post('/api/auth/register', data);
    return response.data;
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post('/api/auth/login', data);
    return response.data;
  }

  async logout(): Promise<void> {
    await apiClient.post('/api/auth/logout');
  }

  async getCurrentUser(): Promise<UserProfile> {
    const response = await apiClient.get('/api/auth/me');
    return response.data;
  }

  async forgotPassword(data: ForgotPasswordRequest): Promise<PasswordResetResponse> {
    const response = await apiClient.post('/api/auth/forgot-password', data);
    return response.data;
  }

  async resetPassword(data: ResetPasswordRequest): Promise<PasswordResetResponse> {
    const response = await apiClient.post('/api/auth/reset-password', data);
    return response.data;
  }

  async refreshToken(): Promise<AuthResponse> {
    const response = await apiClient.post('/api/auth/refresh');
    return response.data;
  }

  saveToken(token: string): void {
    localStorage.setItem('access_token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  logout_local(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  }
}

export default new AuthService();
