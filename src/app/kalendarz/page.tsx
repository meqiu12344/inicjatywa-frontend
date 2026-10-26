import CalendarPageClient from './CalendarPageClient';
import { getBackendUrl } from '@/lib/env';
import type { PaginatedResponse } from '@/lib/api/client';
import type { EventListItem } from '@/types';

export const dynamic = 'force-dynamic';

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ?month=RRRR-MM — miesiąc oglądany przed otwarciem wydarzenia; domyślnie bieżący.
function requestedMonth(value: string | string[] | undefined): Date {
  const match = typeof value === 'string' ? /^(\d{4})-(\d{2})$/.exec(value) : null;
  const now = new Date();
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, 1) : new Date(now.getFullYear(), now.getMonth(), 1);
}

async function getMonthEvents(month: Date): Promise<PaginatedResponse<EventListItem> | undefined> {
  const dateFrom = formatLocalDate(new Date(month.getFullYear(), month.getMonth(), 1));
  const dateTo = formatLocalDate(new Date(month.getFullYear(), month.getMonth() + 1, 0));
  try {
    const response = await fetch(`${getBackendUrl()}/api/events/?date_from=${dateFrom}&date_to=${dateTo}&page_size=100`, {
      cache: 'no-store',
    });
    if (response.ok) {
      return await response.json() as PaginatedResponse<EventListItem>;
    }
    console.error(`Calendar API returned ${response.status}`);
  } catch (error) {
    console.error('Calendar API request failed', error);
  }
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const month = requestedMonth(params.month);
  return (
    <CalendarPageClient
      initialEvents={await getMonthEvents(month)}
      initialMonth={formatLocalDate(month)}
      initialDay={typeof params.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.day) ? params.day : undefined}
    />
  );
}
