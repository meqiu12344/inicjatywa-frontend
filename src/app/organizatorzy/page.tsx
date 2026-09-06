import OrganizersListClient from './OrganizersListClient';
import { getBackendUrl } from '@/lib/env';

export const revalidate = 300;

interface Organizer {
  id: number;
  name: string;
  slug: string | null;
  logo: string | null;
  description: string | null;
  verified: boolean;
  events_count: number;
  average_rating: number | null;
  ratings_count: number;
  ranking_position?: number;
  created_at: string;
}

interface OrganizersResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Organizer[];
}

const EMPTY_RESPONSE: OrganizersResponse = { count: 0, next: null, previous: null, results: [] };

async function getOrganizers(): Promise<OrganizersResponse> {
  try {
    const response = await fetch(`${getBackendUrl()}/api/organizers/?page=1&page_size=12&ordering=ranking`, {
      next: { revalidate },
    });
    return response.ok ? (response.json() as Promise<OrganizersResponse>) : EMPTY_RESPONSE;
  } catch {
    return EMPTY_RESPONSE;
  }
}

export default async function OrganizersListPage() {
  return <OrganizersListClient initialData={await getOrganizers()} />;
}
