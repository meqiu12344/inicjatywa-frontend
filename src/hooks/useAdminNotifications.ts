import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { adminApi, OrganizerRequest } from '@/lib/api/admin';

export type PendingRequest = OrganizerRequest;

export interface AdminNotifications {
  pending_count: number;
  pending_requests: PendingRequest[];
}

// Navbar + badge both use this hook; shared React Query keys (same as the
// /admin/wnioski-organizatorow page) dedupe the requests so polling doesn't
// burn the per-user API throttle (1000/hour).
const POLL_INTERVAL_MS = 2 * 60 * 1000;

export function useAdminNotifications() {
  const { user, isAuthenticated } = useAuth();
  const enabled = isAuthenticated && !!user?.is_staff;

  const statsQuery = useQuery({
    queryKey: ['organizer-request-stats'],
    queryFn: () => adminApi.getOrganizerRequestStats(),
    enabled,
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: POLL_INTERVAL_MS,
    retry: false,
  });

  const requestsQuery = useQuery({
    queryKey: ['organizer-requests', 'pending'],
    queryFn: () => adminApi.getOrganizerRequests('pending'),
    enabled,
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: POLL_INTERVAL_MS,
    retry: false,
  });

  const notifications: AdminNotifications = enabled
    ? {
        pending_count: statsQuery.data?.pending ?? 0,
        pending_requests: requestsQuery.data ?? [],
      }
    : { pending_count: 0, pending_requests: [] };

  const error = statsQuery.error || requestsQuery.error;

  return {
    notifications,
    isLoading: statsQuery.isFetching || requestsQuery.isFetching,
    error: error instanceof Error ? error.message : null,
    refetch: () => Promise.all([statsQuery.refetch(), requestsQuery.refetch()]),
    hasPending: notifications.pending_count > 0,
  };
}
