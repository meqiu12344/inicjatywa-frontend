'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect, useState } from 'react';
import type { User, Profile, AuthTokens } from '@/types';
import { PermissionChecker, createPermissionChecker } from '@/lib/auth/permissions';
import type { User as PermUser, Profile as PermProfile } from '@/lib/auth/permissions';

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

/**
 * Map frontend User/Profile types to permission system types
 */
function toPermUser(user: User | null): PermUser | null {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    is_superuser: user.is_staff ?? false,
    is_staff: user.is_staff ?? false,
    is_active: true,
  };
}

function toPermProfile(profile: Profile | null): PermProfile | null {
  if (!profile) return null;
  return {
    id: profile.id,
    user_id: profile.user?.id ?? 0,
    role: profile.role === 'admin' ? 'organizer' : profile.role as 'user' | 'organizer',
    account_locked: false,
    organizer_request_pending: profile.organizer_request_pending ?? false,
    email_verified: profile.email_verified ?? false,
    phone_number: profile.phone_number ?? null,
  };
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  permissions: PermissionChecker | null;
  
  // Actions
  setAuth: (user: User, profile: Profile, tokens: AuthTokens) => void;
  updateProfile: (profile: Partial<Profile>) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
  
  // Permission checks (convenience)
  can: (action: keyof ReturnType<PermissionChecker['getPermissions']>) => boolean;
  isOrganizer: () => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      tokens: null,
      isAuthenticated: false,
      permissions: null,
      
      setAuth: (user, profile, tokens) => {
        // Store tokens in localStorage for API client
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', tokens.access);
          localStorage.setItem('refresh_token', tokens.refresh);
        }
        const permissions = createPermissionChecker(toPermUser(user), toPermProfile(profile));
        set({ user, profile, tokens, isAuthenticated: true, permissions });
      },
      
      updateProfile: (profileData) =>
        set((state) => {
          const newProfile = state.profile ? { ...state.profile, ...profileData } : null;
          const permissions = createPermissionChecker(toPermUser(state.user), toPermProfile(newProfile));
          return { profile: newProfile, permissions };
        }),

      updateUser: (userData) =>
        set((state) => {
          const newUser = state.user ? { ...state.user, ...userData } : null;
          const permissions = createPermissionChecker(toPermUser(newUser), toPermProfile(state.profile));
          return { user: newUser, permissions };
        }),
      
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('auth-storage');
        }
        set({
          user: null,
          profile: null,
          tokens: null,
          isAuthenticated: false,
          permissions: null,
        });
      },

      can: (action) => {
        const { permissions } = get();
        if (!permissions) return false;
        const perms = permissions.getPermissions();
        return perms[action] ?? false;
      },

      isOrganizer: () => {
        const { profile, user } = get();
        return profile?.role === 'organizer' || profile?.is_organizer || user?.is_staff === true;
      },

      isAdmin: () => {
        const { user } = get();
        return user?.is_staff === true;
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state, error) => {
        // Wrapped in try-catch: if this callback throws, Zustand never sets
        // _hasHydrated = true, which permanently blocks useHydration().
        try {
          if (typeof window === 'undefined' || !state) return;

          // If tokens exist, validate access token before restoring
          if (state.tokens?.access) {
            if (!isTokenValid(state.tokens.access)) {
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              localStorage.removeItem('auth-storage');
              // Mutate state directly — useAuthStore is not yet initialized here
              state.user = null;
              state.profile = null;
              state.tokens = null;
              state.isAuthenticated = false;
              state.permissions = null;
              return;
            }

            localStorage.setItem('access_token', state.tokens.access);
            localStorage.setItem('refresh_token', state.tokens.refresh);
            
            // Recreate permissions after hydration
            if (state.user && state.profile) {
              state.permissions = createPermissionChecker(toPermUser(state.user), toPermProfile(state.profile));
            }
          }
        } catch (err) {
          console.error('Auth rehydration error:', err);
        }
      },
    }
  )
);

/**
 * Hook to check if the store has been hydrated from localStorage
 */
export function useHydration() {
  const [hydrated, setHydrated] = useState(() => {
    return typeof window !== 'undefined' && useAuthStore.persist.hasHydrated();
  });

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }

    const unsubFinishHydration = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    // Safety fallback: if hydration detection fails for any reason,
    // don't leave the app in an infinite loading state.
    const timeout = setTimeout(() => setHydrated(true), 1000);

    return () => {
      unsubFinishHydration();
      clearTimeout(timeout);
    };
  }, []);

  return hydrated;
}
