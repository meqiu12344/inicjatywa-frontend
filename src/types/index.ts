// ========================
// Base Types
// ========================

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff?: boolean;
  profile?: Profile;
}

export interface Profile {
  id: number;
  user?: User;
  role: 'user' | 'organizer' | 'admin';
  bio?: string;
  avatar?: string;
  is_organizer: boolean;
  organization_name?: string;
  organization_logo?: string;
  organization_description?: string;
  website?: string;
  phone?: string;
  facebook_url?: string;
  instagram_url?: string;
  is_public: boolean;
  total_events: number;
  average_rating?: number;
  review_count: number;
  email_verified?: boolean;
  phone_number?: string;
  created_at: string;
  organizer_request_pending?: boolean;
}

// ========================
// Location Types
// ========================

export interface Location {
  id: number;
  country: string;
  country_name?: string;
  postal_code?: string;
  city: string;
  region?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

// ========================
// Category Types
// ========================

export interface Category {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  event_count?: number;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
}

// ========================
// Event Types
// ========================

export type EventType = 'free' | 'voluntary' | 'platform' | 'paid';
export type EventStatus = 'pending' | 'public' | 'draft' | 'hidden' | 'closed';

export interface Event {
  id: number;
  title: string;
  slug: string;
  description: string;
  short_description?: string;
  start_date: string;
  end_date?: string;
  is_permanent: boolean;
  categories: Category[];
  category?: Category;
  tags: Tag[];
  location?: Location;
  organizer?: string;
  image?: string;
  image_thumbnail?: string;
  event_type: EventType;
  status: EventStatus;
  is_top10: boolean;
  ticket_price?: number;
  participant_limit?: number;
  is_limited: boolean;
  available_from?: string;
  available_to?: string;
  ticket_url?: string;
  online_event: boolean;
  online_link?: string;
  created_at: string;
  updated_at: string;
  visible: boolean;
  user: User;
  meta_description?: string;
  is_promoted: boolean;
  promotion_level?: 'bronze' | 'silver' | 'gold';
  views_count?: number;
  registrations_count?: number;
  is_registered?: boolean;
  can_register?: boolean;
  is_fully_booked: boolean;
  needs_poster?: boolean;
  organizer_profile?: {
    id: number;
    slug: string;
    name: string;
    logo?: string | null;
    verified: boolean;
    description?: string | null;
  } | null;
}

export interface EventListItem {
  id: number;
  title: string;
  slug: string;
  start_date: string;
  end_date?: string;
  location?: {
    city: string;
    region?: string;
    address?: string;
  };
  image_thumbnail?: string;
  image?: string;
  event_type: EventType;
  status?: EventStatus;
  categories: Pick<Category, 'id' | 'name' | 'slug'>[];
  category?: Pick<Category, 'id' | 'name' | 'slug'>;
  is_promoted: boolean;
  promotion_level?: 'bronze' | 'silver' | 'gold';
  is_fully_booked: boolean;
  online_event: boolean;
  description?: string;
  registrations_count?: number;
  views_count?: number;
}

export interface EventFilters {
  search?: string;
  category?: number;
  categories?: number[];
  city?: string;
  region?: string;
  date_from?: string;
  date_to?: string;
  event_type?: EventType;
  online?: boolean;
  has_tickets?: boolean;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface CreateEventData {
  title: string;
  description: string;
  start_date: string;
  end_date?: string | null;
  is_permanent?: boolean;
  categories?: number[];
  location_id?: number;
  location?: {
    address?: string;
    city: string;
    postal_code?: string;
    region?: string;
    country?: string;
  };
  organizer?: string;
  event_type?: EventType;
  ticket_price?: number;
  participant_limit?: number | null;
  is_limited?: boolean;
  available_from?: string | null;
  available_to?: string | null;
  is_fully_booked?: boolean;
  needs_poster?: boolean;
  ticket_url?: string;
  online_event?: boolean;
  online_link?: string;
  meta_description?: string;
  status?: EventStatus;
  tags?: string[];
  ticket_types?: TicketTypeInput[];
}

export interface TicketTypeInput {
  name: string;
  price: number;
  quantity: number;
  description?: string;
  max_per_order?: number;
}

// ========================
// Registration Types
// ========================

export interface EventRegistration {
  id: number;
  event: Event;
  user: User;
  registered_at: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  attended: boolean;
  notes?: string;
}

// ========================
// Ticket Types
// ========================

export interface TicketType {
  id: number;
  event: number;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  quantity_sold: number;
  quantity_available: number;
  sales_start?: string;
  sales_end?: string;
  is_available: boolean;
  max_per_order: number;
}

export interface Ticket {
  id: number;
  ticket_type: TicketType;
  order: number;
  ticket_code: string;
  qr_code_url: string;
  status: 'valid' | 'used' | 'cancelled' | 'refunded';
  used_at?: string;
}

export interface TicketOrder {
  id: number;
  order_number: string;
  user: User;
  event: Event;
  tickets: Ticket[];
  total_amount: number;
  platform_fee: number;
  organizer_amount: number;
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'partial_refund';
  payment_intent_id?: string;
  created_at: string;
  paid_at?: string;
}

// ========================
// Promotion Types
// ========================

export type PromotionLevel = 'bronze' | 'silver' | 'gold';

export interface EventPromotion {
  id: number;
  event: Event;
  level: PromotionLevel;
  start_date: string;
  end_date: string;
  is_active: boolean;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  price_paid: number;
  views_count: number;
  clicks_count: number;
}

// ========================
// Organizer Types
// ========================

export interface OrganizerReview {
  id: number;
  organizer: Profile;
  user: User;
  rating: number;
  comment?: string;
  response?: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizerStats {
  total_events: number;
  upcoming_events: number;
  past_events: number;
  total_registrations: number;
  total_tickets_sold: number;
  total_revenue: number;
  average_rating: number;
  review_count: number;
}

// ========================
// Newsletter Types
// ========================

export interface Newsletter {
  id: number;
  title: string;
  slug: string;
  content: string;
  sent_at?: string;
  is_published: boolean;
}

export interface NewsletterSubscription {
  email: string;
  is_active: boolean;
  subscribed_at: string;
}

// ========================
// Auth Types
// ========================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  want_organizer_role?: boolean;
  organization_name?: string;
  organization_nip?: string;
  organization_website?: string;
  organization_description?: string;
  organizer_motivation?: string;
  organization_logo?: File;
  recaptcha_token?: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthUser {
  user: User;
  profile: Profile;
  tokens: AuthTokens;
}

// ========================
// API Response Types
// ========================

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  code?: string;
}
