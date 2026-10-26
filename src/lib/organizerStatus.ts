import { getAllowedStatusTransitions, isEventExpired } from '@/lib/eventUtils';
import type { EventListItem, OrganizerEventStatus } from '@/types';

export type OrganizerEvent = Pick<EventListItem,
  'status' | 'start_date' | 'end_date' | 'end_time_unknown' | 'is_permanent' | 'organizer_status' | 'promotion'
> & { visible?: boolean };

// Fallback dla odpowiedzi zachowanych w pamięci przed aktualizacją API.
export function getOrganizerStatus(event: OrganizerEvent): OrganizerEventStatus {
  if (event.organizer_status) return event.organizer_status;
  let code: OrganizerEventStatus['code'] = event.status || 'unknown';
  if (['public', 'pending', 'closed'].includes(code) && isEventExpired(event)) code = 'ended';
  else if (code === 'public' && event.visible === false) code = 'hidden';
  const text: Record<OrganizerEventStatus['code'], [string, string]> = {
    public: ['Opublikowane', 'Wydarzenie jest widoczne na portalu.'],
    pending: ['Do moderacji', 'Wydarzenie czeka na akceptację moderatora.'],
    ai_draft: ['Do moderacji', 'Wydarzenie dodane przez IK czeka na akceptację moderatora.'],
    draft: ['Szkic', 'Wydarzenie nie jest opublikowane. Uzupełnij je i wyślij do moderacji.'],
    hidden: ['Ukryte', 'Wydarzenie nie pojawia się na publicznej liście wydarzeń.'],
    closed: ['Zamknięte', 'Wydarzenie zostało zamknięte przed końcem terminu.'],
    ended: ['Zakończone', 'Termin wydarzenia minął.'],
    rejected: ['Odrzucone — wymaga poprawy', 'Popraw wydarzenie i wyślij je do moderacji.'],
    unknown: ['Brak statusu', 'Sprawdź ustawienia wydarzenia.'],
  };
  return { code, label: text[code][0], description: text[code][1], rejection_reason: '',
    allowed_transitions: event.status ? getAllowedStatusTransitions(event.status) : [] };
}

export type OrganizerFilter = 'all' | 'public' | 'pending' | 'rejected' | 'ended' | 'promoted';

export function matchesOrganizerFilter(event: OrganizerEvent, filter: OrganizerFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'promoted') return event.promotion?.status === 'active';
  const code = getOrganizerStatus(event).code;
  return filter === 'pending' ? code === 'pending' || code === 'ai_draft' : code === filter;
}
