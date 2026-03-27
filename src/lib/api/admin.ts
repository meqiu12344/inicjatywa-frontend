import { get, post, del, PaginatedResponse } from '@/lib/api/client';

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
  status: string;
  status_display: string;
  event_type: string;
  event_type_display?: string;
  description?: string;
  ticket_price?: number | null;
  participant_limit?: number | null;
  online_event?: boolean;
  online_link?: string | null;
  organizer?: string | null;
  image_url: string | null;
  created_at: string;
  registrations_count?: number;
}

export interface PendingEventStats {
  total: number;
  pending: number;
  public: number;
  draft: number;
  hidden: number;
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

  approveOrganizerRequest: async (id: number, adminNotes?: string): Promise<{ message: string; request: OrganizerRequest }> => {
    return post<{ message: string; request: OrganizerRequest }>(
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
