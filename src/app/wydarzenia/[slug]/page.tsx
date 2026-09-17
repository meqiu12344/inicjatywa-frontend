import { notFound } from 'next/navigation';
import EventPageClient from './EventPageClient';
import { getBackendUrl } from '@/lib/env';
import type { Event } from '@/types';

export const revalidate = 60;

interface EventPageProps {
  params: Promise<{ slug: string }>;
}

async function getEvent(slug: string): Promise<Event | null> {
  try {
    const response = await fetch(`${getBackendUrl()}/api/events/${encodeURIComponent(slug)}/`, {
      next: { revalidate },
    });

    if (response.ok) {
      return response.json() as Promise<Event>;
    }

    // Older API deployments may support only numeric event IDs.
    const listResponse = await fetch(
      `${getBackendUrl()}/api/events/?page_size=100&search=${encodeURIComponent(slug)}`,
      { next: { revalidate } },
    );
    if (!listResponse.ok) return null;

    const list = await listResponse.json() as { results?: Array<{ id: number; slug: string }> };
    const matchingEvent = list.results?.find((event) => event.slug === slug);
    if (!matchingEvent) return null;

    const eventResponse = await fetch(`${getBackendUrl()}/api/events/${matchingEvent.id}/`, {
      next: { revalidate },
    });
    return eventResponse.ok ? (eventResponse.json() as Promise<Event>) : null;
  } catch {
    return null;
  }
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const event = await getEvent(slug);

  if (!event) {
    notFound();
  }

  return <EventPageClient params={params} initialEvent={event} />;
}
