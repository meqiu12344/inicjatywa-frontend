import { get, post, patch, del, PaginatedResponse } from '@/lib/api/client';
import type { LocationType } from '@/types';

// Types
export interface OrganizerRequest {
  id: number;
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    date_joined: string;
  };
  organization_name: string;
  organization_id: string | null;
  organization_logo: string | null;
  official_website: string | null;
  description: string;
  motivation: string;
  document: string | null;
  document_url: string | null;
  logo_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  status_display: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  reviewed_by: {
    id: number;
    username: string;
    email: string;
  } | null;
  reviewed_at: string | null;
  slug: string | null;
  public_email: string | null;
  public_phone: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  twitter_url: string | null;
  is_verified: boolean;
  is_public: boolean;
}

export interface OrganizerRequestStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface AIDuplicateMatch {
  event_id: number;
  title: string;
  start_date: string;
  city: string | null;
  organizer_name: string | null;
  status: string;
  url: string | null;
  similarity: number;
}

export type OrganizerContactStatus = 'to_contact' | 'message_sent' | 'replied' | 'account_created' | 'do_not_contact';

// Organizator w prostym CRM (kontakty zebrane przez AI + status relacji)
export interface OrganizerContact {
  id: number;
  name: string;
  website: string;
  email: string;
  phone: string;
  contact_person: string;
  contact_source_url: string;
  status: OrganizerContactStatus;
  status_display: string;
  status_changed_at: string | null;
  notes: string;
  has_account: boolean;
  account_slug: string | null;
  created_at: string;
  updated_at: string;
  events?: Array<{
    id: number;
    title: string;
    start_date: string;
    status: string;
    public_url: string | null;
    owned_by_organizer: boolean;
    transferable: boolean;
  }>;
  // Opublikowane wydarzenia AI, które można przepisać na konto organizatora
  transferable_count?: number;
}

export type OrganizerContactUpdate = Partial<
  Pick<OrganizerContact, 'name' | 'website' | 'email' | 'phone' | 'contact_person' | 'status' | 'notes'>
>;

// Pochodzenie szkicu dodanego przez API asystenta AI (null dla zwykłych wydarzeń)
export interface AIImportInfo {
  source_url: string;
  source_name: string;
  source_checked_at: string;
  ai_notes: string;
  conflicts: string[];
  venue_name: string;
  currency: string;
  poster_source_url: string;
  missing_fields: string[];
  requires_review: boolean;
  possible_duplicate: boolean;
  duplicate_matches: AIDuplicateMatch[];
  data_status: 'complete' | 'incomplete' | 'conflict';
  data_status_display: string;
  review_status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string;
  token_name: string | null;
  created_at: string;
  event_url: string;
  organizer: OrganizerContact | null;
  organizer_match: '' | 'created' | 'email' | 'website' | 'name' | 'account';
  organizer_email: string;
  organizer_phone: string;
  organizer_contact_person: string;
  organizer_contact_source_url: string;
}

export interface PendingEvent {
  id: number;
  title: string;
  slug: string;
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  location: {
    id: number;
    city: string;
    address: string;
    region: string;
  } | null;
  categories: Array<{
    id: number;
    name: string;
  }>;
  start_date: string;
  end_date: string | null;
  end_time_unknown?: boolean;
  status: string;
  status_display: string;
  event_type: string;
  event_type_display?: string;
  description?: string;
  ticket_price?: number | null;
  participant_limit?: number | null;
  location_type?: LocationType;
  online_event?: boolean;
  online_link?: string | null;
  organizer?: string | null;
  organizer_website?: string | null;
  ticket_url?: string | null;
  needs_poster?: boolean;
  image_url: string | null;
  created_at: string;
  registrations_count?: number;
  ai_import?: AIImportInfo | null;
}

export interface PendingEventStats {
  total: number;
  pending: number;
  public: number;
  draft: number;
  hidden: number;
  ai_draft: number;
  ai_requires_review: number;
  ai_possible_duplicates: number;
}

export interface BulkApproveResult {
  message: string;
  approved: number[];
  failed: Array<{ id: number; error: string }>;
}

export interface EventRegistration {
  id: number;
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  event: number;
  event_title: string;
  registration_date: string;
  attended: boolean;
  notes: string | null;
}

// Admin API
const ADMIN_BASE = '/admin';
const AUTH_ADMIN_BASE = '/auth/admin';

export const adminApi = {
  // Organizer Requests
  getOrganizerRequests: async (status?: string): Promise<OrganizerRequest[]> => {
    const params = status ? `?status=${status}` : '';
    const response = await get<OrganizerRequest[] | PaginatedResponse<OrganizerRequest>>(
      `${AUTH_ADMIN_BASE}/organizer-requests/${params}`
    );
    if (Array.isArray(response)) {
      return response;
    }
    return response.results || [];
  },

  getOrganizerRequest: async (id: number): Promise<OrganizerRequest> => {
    return get<OrganizerRequest>(`${AUTH_ADMIN_BASE}/organizer-requests/${id}/`);
  },

  approveOrganizerRequest: async (id: number, adminNotes?: string): Promise<{ message: string; request: OrganizerRequest; notification_sent?: boolean }> => {
    return post<{ message: string; request: OrganizerRequest; notification_sent?: boolean }>(
      `${AUTH_ADMIN_BASE}/organizer-requests/${id}/approve/`,
      { admin_notes: adminNotes }
    );
  },

  rejectOrganizerRequest: async (id: number, adminNotes: string): Promise<{ message: string; request: OrganizerRequest }> => {
    return post<{ message: string; request: OrganizerRequest }>(
      `${AUTH_ADMIN_BASE}/organizer-requests/${id}/reject/`,
      { admin_notes: adminNotes }
    );
  },

  getOrganizerRequestStats: async (): Promise<OrganizerRequestStats> => {
    return get<OrganizerRequestStats>(`${AUTH_ADMIN_BASE}/organizer-requests/stats/`);
  },

  // Pending Events
  getPendingEvents: async (status?: string): Promise<PendingEvent[]> => {
    const params = status ? `?status=${status}` : '';
    const response = await get<PaginatedResponse<PendingEvent>>(`${ADMIN_BASE}/pending-events/${params}`);
    return response.results;
  },

  // Szkice znalezione przez AI — jedna strona do 100 pozycji, żeby dało się zaznaczać hurtem
  getAIDrafts: async (): Promise<PendingEvent[]> => {
    const response = await get<PaginatedResponse<PendingEvent>>(
      `${ADMIN_BASE}/pending-events/?status=ai_draft&page_size=100`
    );
    return response.results;
  },

  bulkApproveEvents: async (ids: number[]): Promise<BulkApproveResult> => {
    return post<BulkApproveResult>(`${ADMIN_BASE}/pending-events/bulk-approve/`, { ids });
  },

  // Organizatorzy (CRM)
  getOrganizerContacts: async (status?: OrganizerContactStatus): Promise<OrganizerContact[]> => {
    const params = new URLSearchParams({ page_size: '100' });
    if (status) params.set('status', status);
    const response = await get<PaginatedResponse<OrganizerContact>>(`${ADMIN_BASE}/organizer-contacts/?${params}`);
    return response.results;
  },

  getOrganizerContactStats: async (): Promise<Record<OrganizerContactStatus, number>> => {
    return get<Record<OrganizerContactStatus, number>>(`${ADMIN_BASE}/organizer-contacts/stats/`);
  },

  updateOrganizerContact: async (id: number, data: OrganizerContactUpdate): Promise<OrganizerContact> => {
    return patch<OrganizerContact>(`${ADMIN_BASE}/organizer-contacts/${id}/`, data);
  },

  transferOrganizerEvents: async (id: number): Promise<{ message: string; transferred: number[]; contact: OrganizerContact }> => {
    return post<{ message: string; transferred: number[]; contact: OrganizerContact }>(
      `${ADMIN_BASE}/organizer-contacts/${id}/transfer-events/`
    );
  },

  getPendingEvent: async (id: number): Promise<PendingEvent> => {
    return get<PendingEvent>(`${ADMIN_BASE}/pending-events/${id}/`);
  },

  approveEvent: async (id: number): Promise<{ message: string; event: PendingEvent }> => {
    return post<{ message: string; event: PendingEvent }>(
      `${ADMIN_BASE}/pending-events/${id}/approve/`
    );
  },

  rejectEvent: async (id: number, reason?: string): Promise<{ message: string; event: PendingEvent }> => {
    return post<{ message: string; event: PendingEvent }>(
      `${ADMIN_BASE}/pending-events/${id}/reject/`,
      { reason }
    );
  },

  getPendingEventStats: async (): Promise<PendingEventStats> => {
    return get<PendingEventStats>(`${ADMIN_BASE}/pending-events/stats/`);
  },

  // Event Registrations
  getEventRegistrations: async (eventId?: number): Promise<EventRegistration[]> => {
    const params = eventId ? `?event=${eventId}` : '';
    return get<EventRegistration[]>(`${ADMIN_BASE}/registrations/${params}`);
  },

  markAttended: async (registrationId: number): Promise<{ message: string; registration: EventRegistration }> => {
    return post<{ message: string; registration: EventRegistration }>(
      `${ADMIN_BASE}/registrations/${registrationId}/mark_attended/`
    );
  },

  markAbsent: async (registrationId: number): Promise<{ message: string; registration: EventRegistration }> => {
    return post<{ message: string; registration: EventRegistration }>(
      `${ADMIN_BASE}/registrations/${registrationId}/mark_absent/`
    );
  },

  deleteRegistration: async (registrationId: number): Promise<void> => {
    return del<void>(`${ADMIN_BASE}/registrations/${registrationId}/`);
  },
};
