import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { adminApi, PendingEvent } from '@/lib/api/admin';

export interface PendingEventsNotifications {
  pending_count: number;
  pending_events: PendingEvent[];
}

// Navbar + badge both use this hook; shared React Query keys (same as the
// /admin/wydarzenia page) dedupe the requests so polling doesn't burn the
// per-user API throttle (1000/hour).
const POLL_INTERVAL_MS = 2 * 60 * 1000;

export function usePendingEventsNotifications() {
  const { user, isAuthenticated } = useAuth();
  const enabled = isAuthenticated && !!user?.is_staff;

  const statsQuery = useQuery({
    queryKey: ['pending-event-stats'],
    queryFn: () => adminApi.getPendingEventStats(),
    enabled,
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: POLL_INTERVAL_MS,
    retry: false,
  });

  const eventsQuery = useQuery({
    queryKey: ['pending-events', 'pending'],
    queryFn: () => adminApi.getPendingEvents('pending'),
    enabled,
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: POLL_INTERVAL_MS,
    retry: false,
  });

  const notifications: PendingEventsNotifications = enabled
    ? {
        pending_count: statsQuery.data?.pending ?? 0,
        pending_events: eventsQuery.data ?? [],
      }
    : { pending_count: 0, pending_events: [] };

  const error = statsQuery.error || eventsQuery.error;

  return {
    notifications,
    isLoading: statsQuery.isFetching || eventsQuery.isFetching,
    error: error instanceof Error ? error.message : null,
    refetch: () => Promise.all([statsQuery.refetch(), eventsQuery.refetch()]),
    hasPending: notifications.pending_count > 0,
  };
}
