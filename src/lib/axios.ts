import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

/**
 * Shared API client for the AI CFO frontend.
 *
 * The FastAPI backend wraps every response in an envelope:
 *   success → { success: true, message, data, page?, limit?, total?, pages? }
 *   error   → { success: false, message, error_code, details? }
 *
 * This client unwraps `data` (attaching pagination meta as `data._meta`),
 * normalizes errors into `ApiError`, injects the bearer token, and performs a
 * single silent refresh-and-retry when an access token expires.
 */

const BASE_URL: string = import.meta.env.VITE_API_BASE_URL || '';

export interface PageMeta {
  page?: number;
  limit?: number;
  total?: number;
  pages?: number;
}

export class ApiError extends Error {
  status?: number;
  errorCode?: string;
  details?: unknown;

  constructor(message: string, status?: number, errorCode?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorCode = errorCode;
    this.details = details;
  }
}

export function getErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof ApiError) return err.message;
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: unknown; detail?: unknown } | undefined;
    if (data?.message) return String(data.message);
    if (data?.detail) return String(data.detail);
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach bearer token ────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Token refresh (single-flight) ───────────────────────────────────────────
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return null;
  try {
    // Use a bare axios call to avoid recursion through this interceptor.
    const resp = await axios.post(`${BASE_URL}/api/auth/refresh`, { refresh_token: refreshToken });
    const body = resp.data as { success?: boolean; data?: { access_token?: string; refresh_token?: string } };
    if (body?.success && body.data?.access_token) {
      localStorage.setItem('access_token', body.data.access_token);
      if (body.data.refresh_token) localStorage.setItem('refresh_token', body.data.refresh_token);
      return body.data.access_token;
    }
    return null;
  } catch {
    return null;
  }
}

function clearSessionAndRedirect(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

// ── Response interceptor: unwrap envelope, normalize errors, refresh on 401 ──
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const body = response.data as { success?: boolean; message?: string; data?: unknown } & PageMeta & { error_code?: string; details?: unknown } | undefined;
    if (body && typeof body === 'object' && 'success' in body) {
      if (body.success) {
        const meta: PageMeta = { page: body.page, limit: body.limit, total: body.total, pages: body.pages };
        const data = body.data;
        if (data !== undefined && data !== null && typeof data === 'object') {
          (data as { _meta?: PageMeta })._meta = meta;
        }
        response.data = data;
        return response;
      }
      return Promise.reject(new ApiError(body.message || 'Request failed', response.status, body.error_code, body.details));
    }
    return response;
  },
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;
    const url = original?.url || '';
    const isAuthPath = url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh');

    if (status === 401 && original && !original._retry && !isAuthPath) {
      original._retry = true;
      if (!refreshing) {
        refreshing = refreshAccessToken().finally(() => {
          refreshing = null;
        });
      }
      const newToken = await refreshing;
      if (newToken) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      }
      clearSessionAndRedirect();
    }

    const data = error.response?.data as { message?: unknown; detail?: unknown; error_code?: string; details?: unknown } | undefined;
    const message = data?.message || data?.detail || error.message || 'Request failed';
    return Promise.reject(
      new ApiError(typeof message === 'string' ? message : 'Request failed', status, data?.error_code, data?.details)
    );
  }
);

export default apiClient;
