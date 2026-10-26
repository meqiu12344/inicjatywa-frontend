import SearchPageClient from './SearchPageClient';
import { getBackendUrl } from '@/lib/env';
import type { PaginatedResponse } from '@/lib/api/client';
import type { Category, EventListItem } from '@/types';
import { searchFiltersFromParams, searchFiltersKey, type SearchParameters } from '@/lib/searchFilters';

export const revalidate = 60;

const EMPTY_RESULTS: PaginatedResponse<EventListItem> = { count: 0, next: null, previous: null, results: [] };

async function fetchData<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${getBackendUrl()}/api${path}`, { next: { revalidate } });
    return response.ok ? (response.json() as Promise<T>) : null;
  } catch {
    return null;
  }
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParameters> }) {
  const parameters = await searchParams;
  const initialResultsKey = searchFiltersKey(searchFiltersFromParams(parameters));
  const [initialResults, initialCategories] = await Promise.all([
    fetchData<PaginatedResponse<EventListItem>>(`/events/?${initialResultsKey}`),
    fetchData<Category[]>('/categories/'),
  ]);

  return <SearchPageClient initialResults={initialResults ?? EMPTY_RESULTS} initialResultsKey={initialResultsKey} initialCategories={initialCategories ?? []} />;
}
