import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './useAuth';
import { adminApi, PendingEvent } from '@/lib/api/admin';

export interface PendingEventsNotifications {
  pending_count: number;
  pending_events: PendingEvent[];
}

export function usePendingEventsNotifications() {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<PendingEventsNotifications>({
    pending_count: 0,
    pending_events: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingEvents = useCallback(async () => {
    if (!isAuthenticated || !user?.is_staff) {
      setNotifications({ pending_count: 0, pending_events: [] });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [stats, events] = await Promise.all([
        adminApi.getPendingEventStats(),
        adminApi.getPendingEvents('pending'),
      ]);

      setNotifications({
        pending_count: stats.pending,
        pending_events: events,
      });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        // 401 means not authorized — silently reset instead of showing an error
        setNotifications({ pending_count: 0, pending_events: [] });
      } else {
        const message = err instanceof Error ? err.message : 'Wystąpił nieznany błąd';
        setError(message);
        console.error('Error fetching pending events:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.is_staff]);

  // Fetch on mount and when auth state changes
  useEffect(() => {
    if (isAuthenticated && user?.is_staff) {
      fetchPendingEvents();

      // Refresh every 30 seconds
      const interval = setInterval(fetchPendingEvents, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user?.is_staff, fetchPendingEvents]);

  return {
    notifications,
    isLoading,
    error,
    refetch: fetchPendingEvents,
    hasPending: notifications.pending_count > 0,
  };
}
