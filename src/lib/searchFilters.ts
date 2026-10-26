import type { EventFilters, EventListItem, LocationType } from '@/types';

export type SearchParameters = Record<string, string | string[] | undefined>;
type ParamReader = { get(key: string): string | null | undefined };

export interface SearchLocation {
  city: string;
  region: string;
  useRadius: boolean;
  radiusKm: number;
  radiusCity: string;
  includeNationwide: boolean;
  nationwideOnly: boolean;
  onlineOnly: boolean;
}

// Filtr „Forma uczestnictwa”; ogólnopolskie ma osobny przełącznik, bo wyklucza filtr miejsca.
export const PARTICIPATION_FILTERS: LocationType[] = ['onsite', 'online', 'hybrid', 'broadcast'];

export function readParticipation(value: string | null | undefined): LocationType[] {
  return (value || '').split(',').filter((item): item is LocationType => PARTICIPATION_FILTERS.includes(item as LocationType));
}

/** Gdzie wstawić nagłówek sekcji zasobów bez terminu; -1 — brak (np. sortowanie po tytule miesza wyniki). */
export function resourceSectionIndex(events: Pick<EventListItem, 'is_resource'>[], ordering: string): number {
  return ordering.includes('start_date') ? events.findIndex(event => event.is_resource) : -1;
}

export function readSearchLocation(params: ParamReader): SearchLocation {
  const nationwideOnly = params.get('location_type') === 'nationwide';
  const city = nationwideOnly ? '' : params.get('city') || '';
  const onlineOnly = !nationwideOnly && params.get('online') === 'true';
  return {
    city, region: nationwideOnly ? '' : params.get('region') || '',
    useRadius: !nationwideOnly && Boolean(params.get('radius_km')),
    radiusKm: Number(params.get('radius_km')) || 25,
    radiusCity: nationwideOnly ? '' : params.get('radius_city') || city,
    includeNationwide: !nationwideOnly && !onlineOnly && params.get('nationwide') === 'true',
    nationwideOnly, onlineOnly,
  };
}

export function searchLocationFilters(location: SearchLocation): EventFilters {
  if (location.nationwideOnly) return { location_type: 'nationwide' };
  const hasPlace = Boolean(location.region || (location.useRadius ? location.radiusCity : location.city));
  return {
    city: location.useRadius ? undefined : location.city || undefined,
    region: location.region || undefined,
    radius_km: location.useRadius ? location.radiusKm : undefined,
    radius_city: location.useRadius ? location.radiusCity : undefined,
    include_nationwide: hasPlace && location.includeNationwide && !location.onlineOnly ? true : undefined,
    online: location.onlineOnly || undefined,
  };
}

export function writeSearchLocation(params: URLSearchParams, location: SearchLocation): void {
  Object.entries(searchLocationFilters(location)).forEach(([key, value]) => {
    if (value !== undefined) params.set(key === 'include_nationwide' ? 'nationwide' : key, String(value));
  });
}

// Ten sam klucz opisuje zapytanie SSR i dane startowe właściwego filtra w przeglądarce.
export function searchFiltersKey(filters: EventFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).forEach(([key, value]) => {
    if (value === undefined || value === '') return;
    if (Array.isArray(value)) value.forEach(item => params.append(key, String(item)));
    else params.set(key, String(value));
  });
  return params.toString();
}

export function searchPlaceKey(filters: EventFilters): string {
  const keys = ['city', 'region', 'radius_km', 'radius_city', 'location_type', 'include_nationwide', 'online'] as const;
  return JSON.stringify(keys.map(key => filters[key] ?? null));
}

export function searchFiltersFromParams(parameters: SearchParameters): EventFilters {
  const get = (key: string) => {
    const value = parameters[key];
    return Array.isArray(value) ? value[0] : value;
  };
  return {
    search: get('q') || undefined,
    ...searchLocationFilters(readSearchLocation({ get })),
    categories: (get('categories') || '').split(',').map(value => value.trim()).filter(value => /^\d+$/.test(value)).map(Number),
    participation: readParticipation(get('participation')),
    date_from: get('date_from') || undefined, date_to: get('date_to') || undefined,
    event_type: (get('event_type') || undefined) as EventFilters['event_type'],
    ordering: get('ordering') || 'start_date', page: Number(get('page')) || 1, page_size: 12,
  };
}
