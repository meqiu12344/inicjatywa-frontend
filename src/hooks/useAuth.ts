'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth';
import { useAuthStore, useHydration } from '@/stores/authStore';
import type { LoginCredentials, RegisterData, AuthUser, User, Profile } from '@/types';
import type { AxiosRequestConfig } from 'axios';

// API Functions
async function loginUser(credentials: LoginCredentials): Promise<AuthUser> {
  return authApi.login(credentials.email, credentials.password);
}

type RegisterPayload = { data: RegisterData | FormData; config?: AxiosRequestConfig };

async function registerUser({ data, config }: RegisterPayload): Promise<AuthUser> {
  return authApi.register(data as any, config);
}

async function getCurrentUser(): Promise<{ user: User; profile: Profile }> {
  return authApi.getCurrentUser();
}

async function logoutUser(): Promise<void> {
  return authApi.logout();
}

// Hooks
export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    user,
    profile,
    isAuthenticated,
    setAuth,
    logout: storeLogout,
    can,
    isOrganizer: checkIsOrganizer,
  } = useAuthStore();
  
  const hydrated = useHydration();

  // Query for checking auth status on mount
  const { refetch: checkAuth } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getCurrentUser,
    enabled: false,
    retry: false,
  });

  // Login mutation
  // Note: redirect & success toast handled by the calling page (so it can use ?redirect=… etc.)
  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      setAuth(data.user, data.profile, data.tokens);
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      toast.success('Zalogowano pomyślnie!');
    },
    // onError: page handles parsing for inline alerts; no global toast here to avoid duplicates.
  });

  // Register mutation
  // Note: page is responsible for the redirect (e.g. to /logowanie?registered=true)
  // since after register the email isn't verified yet — we don't want the user logged-in.
  const registerMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: (_data) => {
      // Do NOT call setAuth here — backend requires email verification before login.
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
    // onError: handled by the calling page for inline + per-field display
  });

  // Logout mutation — clear local state regardless of API result, single toast.
  const logoutMutation = useMutation({
    mutationFn: logoutUser,
    onSettled: () => {
      storeLogout();
      queryClient.clear();
      toast.success('Wylogowano pomyślnie');
      router.push('/');
    },
  });

  return {
    user,
    profile,
    isAuthenticated,
    isLoading: !hydrated,
    
    // Permission checks
    isOrganizer: checkIsOrganizer(),
    isAdmin: can('isSuperuser'),
    canCreateEvent: can('canCreateEvent'),
    canAccessAdminPanel: can('canAccessAdminPanel'),
    
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    
    // register wrapper accepts (data, mutateOptions?, axiosConfig?)
    register: (data: RegisterData | FormData, mutateOptions?: any, config?: AxiosRequestConfig) =>
      registerMutation.mutate({ data, config }, mutateOptions),
    isRegistering: registerMutation.isPending,
    
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
    
    checkAuth,
  };
}
