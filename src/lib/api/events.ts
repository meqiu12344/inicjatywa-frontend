import { get, post, patch, del, PaginatedResponse } from '@/lib/api/client';
import type { Event, EventListItem, EventFilters, CreateEventData, Category } from '@/types';

const EVENTS_BASE = '/events';

// Build query string from filters
function buildQueryString(filters?: EventFilters): string {
  if (!filters) return '';
  
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach((v) => params.append(key, String(v)));
      } else {
        params.append(key, String(value));
      }
    }
  });
  
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

// Events API
export const eventsApi = {
  // List events (paginated)
  getEvents: async (filters?: EventFilters): Promise<PaginatedResponse<EventListItem>> => {
    return get<PaginatedResponse<EventListItem>>(`${EVENTS_BASE}/${buildQueryString(filters)}`);
  },
  
  // Get single event
  getEvent: async (idOrSlug: string | number): Promise<Event> => {
    return get<Event>(`${EVENTS_BASE}/${idOrSlug}/`);
  },
  
  // Get featured/promoted events
  getFeaturedEvents: async (): Promise<EventListItem[]> => {
    return get<EventListItem[]>(`${EVENTS_BASE}/featured/`);
  },
  
  // Get upcoming events
  getUpcomingEvents: async (limit = 10): Promise<EventListItem[]> => {
    return get<EventListItem[]>(`${EVENTS_BASE}/upcoming/?limit=${limit}`);
  },

  // Get latest events
  getLatestEvents: async (limit = 10): Promise<EventListItem[]> => {
    return get<EventListItem[]>(`${EVENTS_BASE}/latest/?limit=${limit}`);
  },

  // Get top 10 popular events
  getTop10Events: async (): Promise<EventListItem[]> => {
    return get<EventListItem[]>(`${EVENTS_BASE}/top10/`);
  },

  // Get gold promoted events
  getGoldEvents: async (): Promise<EventListItem[]> => {
    return get<EventListItem[]>(`${EVENTS_BASE}/gold/`);
  },

  // Get promoted events (all levels)
  getPromotedEvents: async (): Promise<EventListItem[]> => {
    return get<EventListItem[]>(`${EVENTS_BASE}/promoted/`);
  },

  // Get recommended events (personalized based on user interests)
  getRecommendedEvents: async (): Promise<{ events: EventListItem[]; has_preferences: boolean; categories?: string[]; message?: string }> => {
    return get<{ events: EventListItem[]; has_preferences: boolean; categories?: string[]; message?: string }>(`${EVENTS_BASE}/recommended/`);
  },

  // Get events by category
  getEventsByCategory: async (categoryId: number, limit = 10): Promise<EventListItem[]> => {
    return get<EventListItem[]>(`${EVENTS_BASE}/by-category/${categoryId}/?limit=${limit}`);
  },

  // Get category sliders data (categories with their events)
  getCategorySliders: async (): Promise<{ category_id: number; category_name: string; events: EventListItem[] }[]> => {
    return get<{ category_id: number; category_name: string; events: EventListItem[] }[]>(`${EVENTS_BASE}/category-sliders/`);
  },
  
  // Get user's events
  getMyEvents: async (filters?: EventFilters): Promise<PaginatedResponse<EventListItem>> => {
    return get<PaginatedResponse<EventListItem>>(`${EVENTS_BASE}/my/${buildQueryString(filters)}`);
  },
  
  // Create event
  createEvent: async (data: CreateEventData): Promise<Event> => {
    return post<Event>(`${EVENTS_BASE}/`, data);
  },
  
  // Update event (partial)
  updateEvent: async (id: number, data: Partial<CreateEventData>): Promise<Event> => {
    return patch<Event>(`${EVENTS_BASE}/${id}/`, data);
  },
  
  // Delete event
  deleteEvent: async (id: number): Promise<void> => {
    return del<void>(`${EVENTS_BASE}/${id}/`);
  },
  
  // Upload event image
  uploadImage: async (id: number, file: File): Promise<{ image: string }> => {
    const formData = new FormData();
    formData.append('image', file);
    
    return post<{ image: string }>(`${EVENTS_BASE}/${id}/upload-image/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  // Register for event
  registerForEvent: async (eventId: number): Promise<{ message: string }> => {
    return post<{ message: string }>(`${EVENTS_BASE}/${eventId}/register/`);
  },
  
  // Cancel registration
  cancelRegistration: async (eventId: number): Promise<{ message: string }> => {
    return del<{ message: string }>(`${EVENTS_BASE}/${eventId}/register/`);
  },
  
  // Get registrations for an event (organizer only)
  getEventRegistrations: async (eventId: number): Promise<PaginatedResponse<unknown>> => {
    return get<PaginatedResponse<unknown>>(`${EVENTS_BASE}/${eventId}/registrations/`);
  },

  // Change event status
  changeStatus: async (eventId: number, status: string): Promise<{ message: string; old_status: string; new_status: string }> => {
    return post<{ message: string; old_status: string; new_status: string }>(`${EVENTS_BASE}/${eventId}/change-status/`, { status });
  },

  // Report an error in event
  reportError: async (eventId: number, data: { error_type: string; description: string; reporter_email?: string }): Promise<{ message: string }> => {
    return post<{ message: string }>(`${EVENTS_BASE}/${eventId}/report-error/`, data);
  },

  // Get promotion plans
  getPromotionPlans: async (eventId: number): Promise<unknown> => {
    return get(`${EVENTS_BASE}/${eventId}/promote/`);
  },

  // Create promotion checkout
  createPromotion: async (eventId: number, level: string): Promise<{ checkout_url: string; promotion_id: number }> => {
    return post<{ checkout_url: string; promotion_id: number }>(`${EVENTS_BASE}/${eventId}/promote/`, { level });
  },

  // Get promotion stats
  getPromotionStats: async (eventId: number): Promise<unknown> => {
    return get(`${EVENTS_BASE}/${eventId}/promotion-stats/`);
  },

  // Update registration (attendance/status)
  updateRegistration: async (eventId: number, registrationId: number, data: { attended?: boolean; status?: string }): Promise<unknown> => {
    return post(`${EVENTS_BASE}/${eventId}/registrations/${registrationId}/`, data, { method: 'PATCH' } as any);
  },

  // Delete registration
  deleteRegistration: async (eventId: number, registrationId: number): Promise<void> => {
    return del<void>(`${EVENTS_BASE}/${eventId}/registrations/${registrationId}/`);
  },
};

// Categories API
export const categoriesApi = {
  getCategories: async (): Promise<Category[]> => {
    return get<Category[]>('/categories/');
  },
  
  getCategory: async (id: number): Promise<Category> => {
    return get<Category>(`/categories/${id}/`);
  },
};
