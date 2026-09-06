import CalendarPageClient from './CalendarPageClient';
import { getBackendUrl } from '@/lib/env';
import type { PaginatedResponse } from '@/lib/api/client';
import type { EventListItem } from '@/types';

export const revalidate = 60;

const EMPTY_EVENTS: PaginatedResponse<EventListItem> = {
  count: 0,
  next: null,
  previous: null,
  results: [],
};

async function getCurrentMonthEvents(): Promise<PaginatedResponse<EventListItem>> {
  const now = new Date();
  const dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  try {
    const response = await fetch(`${getBackendUrl()}/api/events/?date_from=${dateFrom}&date_to=${dateTo}&page_size=100`, {
      next: { revalidate },
    });
    return response.ok ? (response.json() as Promise<PaginatedResponse<EventListItem>>) : EMPTY_EVENTS;
  } catch {
    return EMPTY_EVENTS;
  }
}

export default async function CalendarPage() {
  return <CalendarPageClient initialEvents={await getCurrentMonthEvents()} />;
}
