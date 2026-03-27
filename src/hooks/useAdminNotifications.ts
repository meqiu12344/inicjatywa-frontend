import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './useAuth';
import { apiClient } from '@/lib/api/client';

export interface PendingRequest {
  id: number;
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    date_joined: string;
  };
  organization_name: string;
  organization_logo: string | null;
  status: string;
  status_display: string;
  created_at: string;
  reviewed_at: string | null;
}

export interface AdminNotifications {
  pending_count: number;
  pending_requests: PendingRequest[];
}

interface StatsResponse {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export function useAdminNotifications() {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<AdminNotifications>({
    pending_count: 0,
    pending_requests: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingRequests = useCallback(async () => {
    if (!isAuthenticated || !user?.is_staff) {
      setNotifications({ pending_count: 0, pending_requests: [] });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [statsRes, listRes] = await Promise.all([
        apiClient.get<StatsResponse>('/auth/admin/organizer-requests/stats/'),
        apiClient.get<PendingRequest[]>('/auth/admin/organizer-requests/?status=pending'),
      ]);

      const requests = Array.isArray(listRes.data)
        ? listRes.data
        : (listRes.data as any).results || [];

      setNotifications({
        pending_count: statsRes.data.pending,
        pending_requests: requests,
      });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        // 401 means not authorized — silently reset instead of showing an error
        setNotifications({ pending_count: 0, pending_requests: [] });
      } else {
        const message = err instanceof Error ? err.message : 'Wystąpił nieznany błąd';
        setError(message);
        console.error('Error fetching pending requests:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.is_staff]);

  // Fetch on mount and when auth state changes
  useEffect(() => {
    if (isAuthenticated && user?.is_staff) {
      fetchPendingRequests();

      // Refresh every 30 seconds
      const interval = setInterval(fetchPendingRequests, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user?.is_staff, fetchPendingRequests]);

  return {
    notifications,
    isLoading,
    error,
    refetch: fetchPendingRequests,
    hasPending: notifications.pending_count > 0,
  };
}
