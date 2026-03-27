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
  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      setAuth(data.user, data.profile, data.tokens);
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      toast.success('Zalogowano pomyślnie!');
      router.push('/');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: (data) => {
      setAuth(data.user, data.profile, data.tokens);
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      toast.success('Konto utworzone pomyślnie!');
      router.push('/');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      storeLogout();
      queryClient.clear();
      toast.success('Wylogowano pomyślnie');
      router.push('/');
    },
    onError: () => {
      // Even if API fails, clear local state
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
