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

async function getCurrentMonthEvents(): Promise<PaginatedResponse<EventListItem>> {
  const now = new Date();
  const dateFrom = formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const dateTo = formatLocalDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const response = await fetch(`${getBackendUrl()}/api/events/?date_from=${dateFrom}&date_to=${dateTo}&page_size=100`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Calendar API returned ${response.status}`);
  }

  return response.json() as Promise<PaginatedResponse<EventListItem>>;
}

export default async function CalendarPage() {
  return <CalendarPageClient initialEvents={await getCurrentMonthEvents()} />;
}
