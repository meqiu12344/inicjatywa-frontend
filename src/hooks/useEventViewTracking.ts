'use client';

import { useEffect } from 'react';
import { useAuthStore, useHydration } from '@/stores/authStore';
import { trackEventView, canTrackEvent, type TrackableEvent } from '@/lib/event-tracking';

export function useEventViewTracking(event?: TrackableEvent) {
  const hydrated = useHydration();
  const user = useAuthStore(state => state.user);
  const id = event?.id;
  const ownerId = event?.organizer_id ?? event?.user?.id;
  const status = event?.status;
  useEffect(() => {
    if (!hydrated || !event || !canTrackEvent(event)) return;
    let sent = false;
    const record = () => {
      if (!sent && document.visibilityState === 'visible') {
        sent = true;
        void trackEventView(event);
      }
    };
    record();
    document.addEventListener('visibilitychange', record);
    return () => document.removeEventListener('visibilitychange', record);
  }, [hydrated, id, ownerId, status, user]);
}
