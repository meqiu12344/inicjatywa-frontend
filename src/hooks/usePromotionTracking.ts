import { useEffect, useRef } from 'react';
import { eventsApi } from '@/lib/api/events';
import type { EventListItem } from '@/types';

/**
 * Tracks impressions for promoted events when they appear in a list.
 * Deduplicates: only records once per promotion per page load.
 */
export function usePromotionImpressions(events: EventListItem[] | undefined) {
  const tracked = useRef(new Set<number>());

  useEffect(() => {
    if (!events?.length) return;

    const newIds: number[] = [];
    for (const ev of events) {
      if (ev.is_promoted && ev.promotion_id && !tracked.current.has(ev.promotion_id)) {
        tracked.current.add(ev.promotion_id);
        newIds.push(ev.promotion_id);
      }
    }

    if (newIds.length > 0) {
      eventsApi.recordImpressions(newIds);
    }
  }, [events]);
}
