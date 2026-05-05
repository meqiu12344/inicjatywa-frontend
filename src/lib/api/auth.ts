/**
 * Auth API client - handles login, registration, token refresh
 * Response types aligned with Django UserService API views
 */
import { apiClient } from './client';
import type { AxiosRequestConfig } from 'axios';
import type { User, Profile, AuthTokens, AuthUser, RegisterData } from '@/types';

/** Django LoginView response shape */
interface LoginResponse {
  user: User;
  profile: Profile;
  tokens: AuthTokens;
}

/** Django RegisterView response shape */
interface RegisterResponse {
  user: User;
  profile: Profile;
  tokens: AuthTokens;
  message: string;
}

/** Django CurrentUserView / ProfileView response */
interface CurrentUserResponse {
  user: User;
  profile: Profile;
}

/** Django ProfileView GET response (flat format) */
interface ProfileResponse {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  role: string;
  is_organizer: boolean;
  email_verified: boolean;
  organizer_request_pending: boolean;
  profile: {
    bio: string;
    avatar: string | null;
    phone_number: string | null;
  };
}

export const authApi = {
  /**
   * Login user with email and password
   * Django returns: { user, profile, tokens: { access, refresh } }
   */
  login: async (email: string, password: string): Promise<AuthUser> => {
    const response = await apiClient.post<LoginResponse>('/auth/login/', {
      email,
      password,
    });
    return response.data;
  },

  /**
   * Register new user
   * Django returns: { user, profile, tokens: { access, refresh }, message }
   */
  register: async (data: RegisterData | FormData, config?: AxiosRequestConfig): Promise<AuthUser> => {
    const response = await apiClient.post<RegisterResponse>('/auth/register/', data as any, config as any);
    return response.data;
  },

  /**
   * Get current authenticated user (uses JWT)
   * Django returns: { user, profile }
   */
  getCurrentUser: async (): Promise<CurrentUserResponse> => {
    const response = await apiClient.get<CurrentUserResponse>('/auth/me/');
    return response.data;
  },

  /**
   * Get full profile (flat format with nested profile object)
   */
  getProfile: async (): Promise<ProfileResponse> => {
    const response = await apiClient.get<ProfileResponse>('/auth/profile/');
    return response.data;
  },

  /**
   * Update user profile
   */
  updateProfile: async (data: Partial<Profile> | FormData): Promise<ProfileResponse> => {
    const isFormData = data instanceof FormData;
    const response = await apiClient.patch<ProfileResponse>('/auth/profile/', data, 
      isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined
    );
    return response.data;
  },

  /**
   * Submit organizer request
   */
  submitOrganizerRequest: async (data: {
    organization_name: string;
    organization_id?: string;
    official_website?: string;
    description: string;
    motivation: string;
  }) => {
    const response = await apiClient.post('/auth/organizer-request/', data);
    return response.data;
  },

  /**
   * Check organizer request status
   */
  getOrganizerRequestStatus: async () => {
    const response = await apiClient.get('/auth/organizer-request/');
    return response.data;
  },

  /**
   * Request password reset email
   * Backend always returns 200 to prevent email enumeration.
   */
  requestPasswordReset: async (email: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/auth/password-reset/', { email });
    return response.data;
  },

  /**
   * Confirm password reset using uid + token from email link
   */
  confirmPasswordReset: async (data: { uid: string; token: string; new_password: string }): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/auth/password-reset/confirm/', data);
    return response.data;
  },

  /**
   * Logout - blacklists refresh token on backend
   */
  logout: async () => {
    try {
      const refreshToken = typeof window !== 'undefined' 
        ? localStorage.getItem('refresh_token') 
        : null;
      await apiClient.post('/auth/logout/', { refresh: refreshToken });
    } catch (error) {
      // Logout endpoint might fail, but we still clear tokens client-side
    }
  },

  /**
   * Change password
   */
  changePassword: async (data: { old_password: string; new_password: string }) => {
    const response = await apiClient.post('/auth/change-password/', data);
    return response.data;
  },

  /**
   * Delete account
   */
  deleteAccount: async (data: { password: string }) => {
    const response = await apiClient.post('/auth/delete-account/', data);
    return response.data;
  },

  /**
   * Get user interests (favorite categories)
   */
  getInterests: async (): Promise<{ favorite_categories: number[]; all_categories: { id: number; name: string; value: string }[] }> => {
    const response = await apiClient.get<{ favorite_categories: number[]; all_categories: { id: number; name: string; value: string }[] }>('/auth/interests/');
    return response.data;
  },

  /**
   * Update user interests (favorite categories)
   */
  updateInterests: async (categoryIds: number[]): Promise<{ message: string; favorite_categories: number[] }> => {
    const response = await apiClient.put<{ message: string; favorite_categories: number[] }>('/auth/interests/', {
      category_ids: categoryIds,
    });
    return response.data;
  },

  /**
   * Get event history
   */
  getEventHistory: async () => {
    const response = await apiClient.get('/auth/event-history/');
    return response.data;
  },

  /**
   * Get purchase history
   */
  getPurchaseHistory: async () => {
    const response = await apiClient.get('/auth/purchase-history/');
    return response.data;
  },
};
