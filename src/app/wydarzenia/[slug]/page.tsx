import { notFound } from 'next/navigation';
import EventPageClient from './EventPageClient';
import { getBackendUrl } from '@/lib/env';
import type { Event } from '@/types';

interface EventPageProps {
  params: Promise<{ slug: string }>;
}

async function getEvent(slug: string): Promise<Event | null> {
  const url = `${getBackendUrl()}/api/events/${encodeURIComponent(slug)}/`;
  let response: Response | undefined;
  let lastError: unknown;

  // Detail pages use SSR. Avoid Next's ISR data cache here: this Worker does
  // not configure a persistent incremental cache for revalidation.
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      response = await fetch(url, { cache: 'no-store' });
      if (response.status < 500 || attempt === 2) break;
    } catch (error) {
      lastError = error;
      if (attempt === 2) break;
    }

    await new Promise((resolve) => setTimeout(resolve, 150 * attempt));
  }

  if (!response) {
    console.error('[event-page] Event API request failed', {
      slug,
      error: lastError instanceof Error ? lastError.message : String(lastError),
    });
    throw new Error(`Event API request failed for ${slug}`);
  }

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    console.error('[event-page] Event API returned an error', {
      slug,
      status: response.status,
    });
    throw new Error(`Event API returned ${response.status} for ${slug}`);
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
