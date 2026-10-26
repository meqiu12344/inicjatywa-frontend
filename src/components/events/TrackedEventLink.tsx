'use client';

import { useEffect, useRef, type ComponentProps } from 'react';
import Link from 'next/link';
import { useAuthStore, useHydration } from '@/stores/authStore';
import { canTrackEvent, trackCard, type TrackableEvent } from '@/lib/event-tracking';
import { observeEventCard } from '@/lib/event-visibility';
import { rememberReturnContext } from '@/lib/returnContext';

type Props = Omit<ComponentProps<typeof Link>, 'ref'> & { event: TrackableEvent };

export function TrackedEventLink({ event, onClick, onAuxClick, ...props }: Props) {
  const ref = useRef<HTMLAnchorElement>(null);
  const hydrated = useHydration();
  const user = useAuthStore(state => state.user);
  const recorded = useRef('');
  const { id, promotion_id, organizer_id, status } = event;
  const ownerId = organizer_id ?? event.user?.id;
  useEffect(() => {
    const key = `${id}:${promotion_id ?? ''}`;
    if (!hydrated || !ref.current || !canTrackEvent(event) || recorded.current === key) return;
    return observeEventCard(ref.current, () => {
      recorded.current = key;
      void trackCard(event, 'card_impression');
    });
  }, [hydrated, id, promotion_id, ownerId, status, user]);

  return <Link {...props} ref={ref}
    onClick={click => {
      onClick?.(click);
      if (click.defaultPrevented) return;
      // Zapamiętaj listę i miejsce przewinięcia — „Powrót” na stronie wydarzenia wróci dokładnie tutaj.
      rememberReturnContext(id);
      void trackCard(event, 'card_click');
    }}
    onAuxClick={click => {
      onAuxClick?.(click);
      if (click.button !== 1 || click.defaultPrevented) return;
      rememberReturnContext(id);
      void trackCard(event, 'card_click');
    }}
  />;
}
