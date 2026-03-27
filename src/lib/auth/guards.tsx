/**
 * Permission guards and hooks for components
 * Uses the unified auth store from @/stores/authStore
 */
import { useAuthStore } from '@/stores/authStore';
import { ReactNode } from 'react';

/**
 * Component that only renders if permission check passes
 */
interface PermissionGuardProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGuard({ permission, children, fallback = null }: PermissionGuardProps) {
  const can = useAuthStore((state) => state.can);
  const isAllowed = can(permission as any);

  return isAllowed ? children : fallback;
}

/**
 * Hook to check if user has permission
 */
export function usePermission(permission: string): boolean {
  const can = useAuthStore((state) => state.can);
  return can(permission as any);
}

/**
 * Hook to check multiple permissions (AND logic)
 */
export function usePermissions(permissions: string[]): boolean {
  const can = useAuthStore((state) => state.can);
  return permissions.every((p) => can(p as any));
}

/**
 * Hook to check if user can perform action
 */
export function useCanCreateEvent(): boolean {
  return useAuthStore((state) => state.can('canCreateEvent'));
}

export function useCanEditEvent(eventOwnerId: number): boolean {
  const permissions = useAuthStore((state) => state.permissions);
  if (!permissions) return false;
  return permissions.canEditEvent(eventOwnerId);
}

export function useCanDeleteEvent(eventOwnerId: number): boolean {
  const permissions = useAuthStore((state) => state.permissions);
  if (!permissions) return false;
  return permissions.canDeleteEvent(eventOwnerId);
}

export function useCanAccessAdminPanel(): boolean {
  return useAuthStore((state) => state.can('canAccessAdminPanel'));
}

export function useCanRegisterForEvent(): boolean {
  return useAuthStore((state) => state.can('canRegisterForEvent'));
}

export function useCanRequestOrganizerRole(): boolean {
  return useAuthStore((state) => state.can('canRequestOrganizerRole'));
}

export function useIsOrganizer(): boolean {
  return useAuthStore((state) => state.can('isOrganizer'));
}

export function useIsAuthenticated(): boolean {
  return useAuthStore((state) => state.can('isAuthenticated'));
}

export function useIsSuperuser(): boolean {
  return useAuthStore((state) => state.can('isSuperuser'));
}

/**
 * Component that only renders if user is authenticated
 */
interface RequireAuthProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequireAuth({ children, fallback = null }: RequireAuthProps) {
  const isAuthenticated = useAuthStore((state) => state.can('isAuthenticated'));
  return isAuthenticated ? children : fallback;
}

/**
 * Component that only renders if user is organizer
 */
interface RequireOrganizerProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequireOrganizer({ children, fallback = null }: RequireOrganizerProps) {
  const isOrganizer = useAuthStore((state) => state.can('isOrganizer'));
  return isOrganizer ? children : fallback;
}

/**
 * Component that only renders if user is admin
 */
interface RequireAdminProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequireAdmin({ children, fallback = null }: RequireAdminProps) {
  const isAdmin = useAuthStore((state) => state.can('isSuperuser'));
  return isAdmin ? children : fallback;
}
