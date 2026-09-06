import { notFound } from 'next/navigation';
import OrganizerProfileClient from './OrganizerProfileClient';
import { getBackendUrl } from '@/lib/env';
import type { EventListItem } from '@/types';

export const revalidate = 300;

interface PageProps { params: Promise<{ slug: string }>; }

async function getData<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${getBackendUrl()}/api${path}`, { next: { revalidate } });
    return response.ok ? (response.json() as Promise<T>) : null;
  } catch {
    return null;
  }
}

export default async function OrganizerProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const [organizer, events, reviews] = await Promise.all([
    getData(`/organizers/${encodeURIComponent(slug)}/`),
    getData<{ results: EventListItem[] }>(`/events/?organizer=${encodeURIComponent(slug)}&page_size=6&upcoming=true`),
    getData(`/organizers/${encodeURIComponent(slug)}/reviews/?page=1`),
  ]);

  if (!organizer || !events || !reviews) notFound();

  return <OrganizerProfileClient initialOrganizer={organizer as any} initialEvents={events} initialReviews={reviews as any} />;
}
