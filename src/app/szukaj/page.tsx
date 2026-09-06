import SearchPageClient from './SearchPageClient';
import { getBackendUrl } from '@/lib/env';
import type { PaginatedResponse } from '@/lib/api/client';
import type { Category, EventListItem } from '@/types';

export const revalidate = 60;

type SearchParams = Record<string, string | string[] | undefined>;

const EMPTY_RESULTS: PaginatedResponse<EventListItem> = { count: 0, next: null, previous: null, results: [] };

async function fetchData<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${getBackendUrl()}/api${path}`, { next: { revalidate } });
    return response.ok ? (response.json() as Promise<T>) : null;
  } catch {
    return null;
  }
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function buildEventsQuery(searchParams: SearchParams): string {
  const params = new URLSearchParams({ page: firstValue(searchParams.page) || '1', page_size: '12', ordering: firstValue(searchParams.ordering) || 'start_date' });
  const mappings = [['q', 'search'], ['city', 'city'], ['region', 'region'], ['date_from', 'date_from'], ['date_to', 'date_to'], ['event_type', 'event_type'], ['online', 'online'], ['radius_km', 'radius_km'], ['radius_city', 'radius_city']] as const;
  mappings.forEach(([source, target]) => {
    const value = firstValue(searchParams[source]);
    if (value) params.set(target, value);
  });
  (firstValue(searchParams.categories) || '').split(',').filter(Boolean).forEach((category) => params.append('categories', category));
  return params.toString();
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const parameters = await searchParams;
  const [initialResults, initialCategories] = await Promise.all([
    fetchData<PaginatedResponse<EventListItem>>(`/events/?${buildEventsQuery(parameters)}`),
    fetchData<Category[]>('/categories/'),
  ]);

  return <SearchPageClient initialResults={initialResults ?? EMPTY_RESULTS} initialCategories={initialCategories ?? []} />;
}
