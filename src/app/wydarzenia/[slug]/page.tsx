import { notFound } from 'next/navigation';
import EventPageClient from './EventPageClient';
import { getBackendUrl } from '@/lib/env';
import type { Event } from '@/types';

export const revalidate = 60;

interface EventPageProps {
  params: Promise<{ slug: string }>;
}

async function getEvent(slug: string): Promise<Event | null> {
  const response = await fetch(`${getBackendUrl()}/api/events/${encodeURIComponent(slug)}/`, {
    next: { revalidate },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Event API returned ${response.status}`);
  }

  return response.json() as Promise<Event>;
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const event = await getEvent(slug);

  if (!event) {
    notFound();
  }

  return <EventPageClient params={params} initialEvent={event} />;
}
