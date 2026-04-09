import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { useAuthStore } from '@/stores/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://test.inicjatywakatolicka.pl';

// Flag to track if token refresh is in progress (prevents refresh spam)
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;
let refreshSubscribers: Array<{ resolve: (token: string) => void; reject: (error: any) => void }> = [];

const subscribeTokenRefresh = (resolve: (token: string) => void, reject: (error: any) => void) => {
  refreshSubscribers.push({ resolve, reject });
};

const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach(({ resolve }) => resolve(token));
  refreshSubscribers = [];
};

const onTokenRefreshFailed = (error: any) => {
  refreshSubscribers.forEach(({ reject }) => reject(error));
  refreshSubscribers = [];
};

// Create axios instance
export const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Endpoints that don't need authorization header
const PUBLIC_ENDPOINTS = ['/auth/login/', '/auth/register/', '/auth/token/refresh/'];

const isPublicEndpointUrl = (url?: string) =>
  !!url && PUBLIC_ENDPOINTS.some((endpoint) => url.includes(endpoint));

const isTokenValid = (token: string) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1] || '')) as { exp?: number };
    if (!payload?.exp) return false;
    const now = Math.floor(Date.now() / 1000);
    return payload.exp > now + 10; // 10s buffer
  } catch {
    return false;
  }
};

// Request interceptor - add auth token & HTTP method override for Apache compatibility
apiClient.interceptors.request.use(
  (config) => {
    // Apache on shared hosting blocks PUT/PATCH/DELETE - tunnel via POST + header
    const method = config.method?.toUpperCase();
    if (method && ['PUT', 'PATCH', 'DELETE'].includes(method)) {
      config.headers['X-HTTP-Method-Override'] = method;
      config.method = 'post';
    }

    // Skip auth header for public endpoints (login, register, refresh)
    const isPublicEndpoint = isPublicEndpointUrl(config.url);
    
    // Get token from localStorage (client-side only)
    if (typeof window !== 'undefined' && !isPublicEndpoint) {
      const token = localStorage.getItem('access_token');
      if (token && isTokenValid(token)) {
        config.headers.Authorization = `Bearer ${token}`;
      } else if (token && !isTokenValid(token)) {
        localStorage.removeItem('access_token');
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Handle 401 - try to refresh token
    const isPublicEndpoint = isPublicEndpointUrl(originalRequest.url);
    if (error.response?.status === 401 && !originalRequest._retry && !isPublicEndpoint) {
      originalRequest._retry = true;

      // If a refresh is already in progress, wait for it instead of starting another
      if (isRefreshing && refreshPromise) {
        try {
          const token = await refreshPromise;
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        } catch {
          return Promise.reject(error);
        }
      }

      isRefreshing = true;

      // Create a single refresh promise that all concurrent 401s will share
      refreshPromise = new Promise<string>(async (resolveRefresh, rejectRefresh) => {
        try {
          const refreshToken = localStorage.getItem('refresh_token');
          if (!refreshToken) {
            throw new Error('No refresh token');
          }
          const response = await axios.post(`${API_URL}/api/auth/token/refresh/`, {
            refresh: refreshToken,
          });

          const { access } = response.data;
          localStorage.setItem('access_token', access);

          // Notify all queued requests with new token
          onTokenRefreshed(access);
          resolveRefresh(access);
        } catch (refreshError) {
          // Refresh failed - logout user and clear all auth state
          onTokenRefreshFailed(refreshError);
          useAuthStore.getState().logout();
          // Only redirect if we're not already on the login page
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/logowanie')) {
            window.location.href = '/logowanie';
          }
          rejectRefresh(refreshError);
        } finally {
          isRefreshing = false;
          refreshPromise = null;
        }
      });

      try {
        const token = await refreshPromise;
        // Retry original request
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
        }
        return apiClient(originalRequest);
      } catch {
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

// Generic API response type
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

// Paginated response type
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Error response type
export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

// Helper functions
export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response: AxiosResponse<T> = await apiClient.get(url, config);
  return response.data;
}

export async function post<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
  const response: AxiosResponse<T> = await apiClient.post(url, data, config);
  return response.data;
}

export async function put<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
  const response: AxiosResponse<T> = await apiClient.put(url, data, config);
  return response.data;
}

export async function patch<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
  const response: AxiosResponse<T> = await apiClient.patch(url, data, config);
  return response.data;
}

export async function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response: AxiosResponse<T> = await apiClient.delete(url, config);
  return response.data;
}

// Error helper — handles all DRF error shapes
export function getErrorMessage(error: unknown, fallback?: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data) {
      // { "error": "..." } — custom views
      if (typeof data.error === 'string') return data.error;
      // { "detail": "..." } — DRF default
      if (typeof data.detail === 'string') return data.detail;
      // { "message": "..." } — custom shape
      if (typeof data.message === 'string') return data.message;
      // { "non_field_errors": ["..."] } — DRF serializer
      if (Array.isArray(data.non_field_errors)) return data.non_field_errors.join(' ');
      // { "field": ["err1","err2"], ... } — DRF field errors
      if (typeof data === 'object' && !Array.isArray(data)) {
        const fieldMessages: string[] = [];
        for (const [, val] of Object.entries(data)) {
          if (Array.isArray(val)) fieldMessages.push(...val.map(String));
          else if (typeof val === 'string') fieldMessages.push(val);
        }
        if (fieldMessages.length) return fieldMessages.join(' ');
      }
      // plain string body
      if (typeof data === 'string' && data.length < 200) return data;
    }
    if (error.response?.status === 404) return 'Nie znaleziono zasobu';
    if (error.response?.status === 403) return 'Brak dostępu';
    if (error.response?.status === 500) return 'Błąd serwera. Spróbuj ponownie później.';
  }
  return fallback ?? 'Wystąpił nieoczekiwany błąd';
}
