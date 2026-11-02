import { notFound } from 'next/navigation';
import OrganizerProfileClient from './OrganizerProfileClient';
import { getBackendUrl } from '@/lib/env';
import type { EventListItem } from '@/types';

export const revalidate = 300;

interface PageProps { params: Promise<{ slug: string }>; }

async function fetchApi(path: string): Promise<Response | null> {
  try {
    return await fetch(`${getBackendUrl()}/api${path}`, { next: { revalidate } });
  } catch {
    return null;
  }
}

async function getData<T>(path: string): Promise<T | undefined> {
  const response = await fetchApi(path);
  return response?.ok ? (response.json() as Promise<T>) : undefined;
}

async function getOrganizer(slug: string): Promise<unknown | null> {
  const response = await fetchApi(`/organizers/${encodeURIComponent(slug)}/`);

  // Only a real 404 means the profile does not exist. Throttling (429), backend
  // errors or timeouts must not turn an existing profile into "Strona nie znaleziona".
  if (response?.status === 404) return null;
  if (!response?.ok) {
    console.error('[organizer-page] Organizer API request failed', { slug, status: response?.status });
    throw new Error(`Organizer API request failed for ${slug}`);
  }
  return response.json();
}

export default async function OrganizerProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const eventsParams = new URLSearchParams({
    organizer: slug,
    page_size: '6',
    upcoming: 'true',
  });
  const [organizer, events, reviews] = await Promise.all([
    getOrganizer(slug),
    getData<{ results: EventListItem[] }>(`/events/?${eventsParams.toString()}`),
    getData(`/organizers/${encodeURIComponent(slug)}/reviews/?page=1`),
  ]);

  if (!organizer) notFound();

  // Events / reviews missing from SSR are fetched again in the browser.
  return <OrganizerProfileClient initialOrganizer={organizer as any} initialEvents={events} initialReviews={reviews as any} />;
}
