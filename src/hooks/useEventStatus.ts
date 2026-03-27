/**
 * Hook useEventStatus
 * 
 * Zarządza logiką statusów wydarzeń na frontendzie.
 * Odzwierciedla logikę z backendu Django (EventService/models.py)
 */

import { useMemo, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';
import type { Event, EventStatus } from '@/types';
import {
  getEffectiveStatus,
  shouldAutoClose,
  shouldAutoReopen,
  isEventExpired,
  isEventOngoing,
  isEventUpcoming,
  isEventEditable,
  canRegister,
  canPromote,
  canBePublished,
  areTicketsAvailable,
  getDaysUntilEvent,
  getDaysSinceEventEnded,
  getAllowedStatusTransitions,
  getEventStateSummary,
  getStatusLabel,
} from '@/lib/eventUtils';

interface UseEventStatusOptions {
  /** Automatycznie pokazuj toast przy zmianie statusu */
  showToasts?: boolean;
  /** Klucze query do invalidacji po zmianie statusu */
  invalidateQueries?: string[];
}

/**
 * Hook do zarządzania statusami wydarzeń
 */
export function useEventStatus(event: Event | null, options: UseEventStatusOptions = {}) {
  const { showToasts = true, invalidateQueries = ['my-events', 'events'] } = options;
  const queryClient = useQueryClient();

  // Oblicz efektywny status (uwzględniając auto-close/auto-reopen)
  const effectiveStatus = useMemo(() => {
    if (!event) return null;
    return getEffectiveStatus(event);
  }, [event]);

  // Sprawdź czy status został automatycznie zmieniony
  const statusWasAutoChanged = useMemo(() => {
    if (!event) return false;
    return event.status !== effectiveStatus;
  }, [event, effectiveStatus]);

  // Podsumowanie stanu wydarzenia
  const stateSummary = useMemo(() => {
    if (!event) return null;
    return getEventStateSummary(event);
  }, [event]);

  // Dozwolone przejścia statusów
  const allowedTransitions = useMemo(() => {
    if (!event) return [];
    return getAllowedStatusTransitions(event.status);
  }, [event]);

  // Mutacja zmiany statusu
  const changeStatusMutation = useMutation({
    mutationFn: async ({ eventId, status }: { eventId: number; status: EventStatus }) => {
      const response = await apiClient.post(`/events/${eventId}/change-status/`, { status });
      return response.data;
    },
    onSuccess: (data) => {
      if (showToasts) {
        toast.success(data.message || 'Status został zmieniony');
      }
      // Invaliduj queries
      invalidateQueries.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
    },
    onError: (error: any) => {
      if (showToasts) {
        toast.error(error.response?.data?.error || 'Nie udało się zmienić statusu');
      }
    },
  });

  // Funkcja do zmiany statusu
  const changeStatus = useCallback((newStatus: EventStatus) => {
    if (!event) return;
    changeStatusMutation.mutate({ eventId: event.id, status: newStatus });
  }, [event, changeStatusMutation]);

  // Sprawdzenia stanu wydarzenia
  const checks = useMemo(() => {
    if (!event) {
      return {
        isExpired: false,
        isOngoing: false,
        isUpcoming: false,
        isEditable: false,
        canRegister: { canRegister: false, reason: 'Brak wydarzenia' },
        canPromote: { canPromote: false, reason: 'Brak wydarzenia' },
        canPublish: { canPublish: false, missingFields: [] },
        ticketsAvailable: { available: false, reason: 'Brak wydarzenia' },
        daysUntil: null,
        daysSince: null,
      };
    }

    return {
      isExpired: isEventExpired(event),
      isOngoing: isEventOngoing(event),
      isUpcoming: isEventUpcoming(event),
      isEditable: isEventEditable(event),
      canRegister: canRegister(event, false), // Bez sprawdzania auth
      canPromote: canPromote(event),
      canPublish: canBePublished(event),
      ticketsAvailable: areTicketsAvailable(event),
      daysUntil: isEventUpcoming(event) ? getDaysUntilEvent(event) : null,
      daysSince: isEventExpired(event) ? getDaysSinceEventEnded(event) : null,
    };
  }, [event]);

  // Wiadomość o automatycznej zmianie statusu
  const autoChangeMessage = useMemo(() => {
    if (!event || !statusWasAutoChanged) return null;

    if (shouldAutoClose(event)) {
      return {
        type: 'auto-close' as const,
        message: 'Wydarzenie zostało automatycznie zamknięte, ponieważ data zakończenia minęła.',
        suggestedStatus: 'closed' as EventStatus,
      };
    }

    if (shouldAutoReopen(event)) {
      return {
        type: 'auto-reopen' as const,
        message: 'Wydarzenie może zostać ponownie otwarte, ponieważ data rozpoczęcia jest w przyszłości.',
        suggestedStatus: 'public' as EventStatus,
      };
    }

    return null;
  }, [event, statusWasAutoChanged]);

  return {
    // Status
    currentStatus: event?.status || null,
    effectiveStatus,
    statusWasAutoChanged,
    autoChangeMessage,
    statusLabel: effectiveStatus ? getStatusLabel(effectiveStatus) : null,

    // Dozwolone przejścia
    allowedTransitions,

    // Sprawdzenia
    ...checks,

    // Podsumowanie
    stateSummary,

    // Akcje
    changeStatus,
    isChangingStatus: changeStatusMutation.isPending,
    changeStatusError: changeStatusMutation.error,
  };
}

/**
 * Hook do sprawdzania czy wydarzenie powinno być automatycznie zamknięte
 * Użyteczny do wyświetlania ostrzeżeń użytkownikowi
 */
export function useAutoCloseCheck(event: Event | null) {
  return useMemo(() => {
    if (!event) {
      return {
        shouldClose: false,
        shouldReopen: false,
        effectiveStatus: null,
        message: null,
      };
    }

    const shouldClose = shouldAutoClose(event);
    const shouldReopen = shouldAutoReopen(event);
    const effective = getEffectiveStatus(event);

    let message: string | null = null;
    if (shouldClose) {
      message = 'To wydarzenie minęło i zostanie automatycznie zamknięte przy następnym zapisie.';
    } else if (shouldReopen) {
      message = 'To wydarzenie ma datę w przyszłości i może zostać ponownie otwarte.';
    }

    return {
      shouldClose,
      shouldReopen,
      effectiveStatus: effective,
      message,
      wasStatusChanged: event.status !== effective,
    };
  }, [event]);
}

/**
 * Hook do filtrowania wydarzeń według statusu
 */
export function useFilteredEvents<T extends { status: EventStatus; start_date: string; end_date?: string }>(
  events: T[],
  filter: 'upcoming' | 'past' | 'pending' | 'closed' | 'all'
) {
  return useMemo(() => {
    if (filter === 'all') return events;

    return events.filter(event => {
      const effective = getEffectiveStatus(event as any);
      
      switch (filter) {
        case 'upcoming':
          return isEventUpcoming(event) && effective !== 'closed';
        case 'past':
          return isEventExpired(event);
        case 'pending':
          return event.status === 'pending';
        case 'closed':
          return effective === 'closed';
        default:
          return true;
      }
    });
  }, [events, filter]);
}

export default useEventStatus;
