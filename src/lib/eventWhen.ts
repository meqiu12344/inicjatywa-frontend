import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { EventListItem } from '@/types';

type EventWhen = Pick<EventListItem, 'start_date' | 'end_date' | 'start_time_unknown' | 'is_permanent'
  | 'recurrence' | 'recurrence_label' | 'next_occurrence'>;

/**
 * Kiedy — na kartach i listach. Cykliczne pokazuje regułę i najbliższy termin, wielodniowe zakres dat
 * (albo „Trwa do…”, gdy już trwa), stałe bez daty — zamiast samej daty pierwszego dnia.
 */
export function formatEventWhen(event: EventWhen, now: Date = new Date()): string {
  if (event.is_permanent) return 'Wydarzenie trwa cały czas';
  const day = (value: Date, pattern = 'd MMMM yyyy') => format(value, pattern, { locale: pl });
  const start = new Date(event.start_date);
  if (event.recurrence) {
    const next = event.next_occurrence ? new Date(event.next_occurrence.start) : null;
    if (!next) return event.recurrence_label || '';
    const when = event.start_time_unknown ? day(next, 'd MMMM') : `${day(next, 'd MMMM')}, ${format(next, 'HH:mm')}`;
    return `${event.recurrence_label} • najbliżej ${when}`;
  }
  if (event.end_date && new Date(event.end_date).toDateString() !== start.toDateString()) {
    const end = new Date(event.end_date);
    return start <= now ? `Trwa do ${day(end)}` : `${day(start, 'd MMMM')} – ${day(end)}`;
  }
  return event.start_time_unknown ? day(start) : `${day(start)} • ${format(start, 'HH:mm')}`;
}
