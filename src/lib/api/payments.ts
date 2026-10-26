import { post } from '@/lib/api/client';
import type { EventType, LocationType } from '@/types';

export interface CreateEventPaymentData {
  event_data: {
    title: string;
    description: string;
    start_date: string;
    end_date?: string | null;
    end_time_unknown?: boolean;
    is_permanent: boolean;
    location?: {
      address: string;
      city: string;
      postal_code: string;
      region: string;
      latitude?: number | null;
      longitude?: number | null;
    };
    event_type: EventType;
    participant_limit?: number | null;
    is_limited: boolean;
    ticket_price?: number | null;
    ticket_url?: string;
    organizer?: string;
    organizer_website?: string;
    available_from?: string;
    available_to?: string;
    location_type?: LocationType;
    online_event: boolean;
    online_link?: string;
  };
  payment_type: 'donation' | 'ai_poster';
  amount: number;
  categories: number[];
  tags: string[];
  ticket_types?: {
    name: string;
    price: number;
    quantity: number;
    description?: string;
    max_per_order?: number;
  }[];
}

export interface CreateEventFreeData {
  event_data: CreateEventPaymentData['event_data'];
  categories: number[];
  tags: string[];
  ticket_types?: CreateEventPaymentData['ticket_types'];
}

export interface PaymentCheckoutResponse {
  checkout_url: string;
  session_id: string;
  event_id: number;
  event_slug: string;
}

export interface EventCreatedResponse {
  event_id: number;
  event_slug: string;
  /** 'public' u Zaufanego Organizatora, w pozostałych przypadkach 'pending'. */
  status?: 'pending' | 'public';
  message: string;
}

export interface PaymentConfirmResponse {
  event_id: number;
  event_slug: string;
  status: string;
  message: string;
}

export interface PaymentCancelResponse {
  message: string;
}

export interface PromotionConfirmation {
  promotion_id: number;
  event_id: number;
  event_title: string;
  event_slug: string;
  level: 'bronze' | 'silver' | 'gold';
  level_display: string;
  start_date: string;
  end_date: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  status: 'pending' | 'active' | 'failed' | 'refunded' | 'expired' | 'scheduled' | 'inactive';
  status_display: string;
}

export const paymentsApi = {
  confirmPromotion: (promotionId: string, sessionId: string | null): Promise<PromotionConfirmation> => {
    return post<PromotionConfirmation>('/payments/confirm-promotion/', {
      promotion_id: promotionId,
      ...(sessionId ? { session_id: sessionId } : {}),
    }, { timeout: 15000 });
  },

  /**
   * Create event with payment (donation or AI poster)
   * Returns Stripe checkout URL
   */
  createEventWithPayment: async (data: CreateEventPaymentData): Promise<PaymentCheckoutResponse> => {
    return post<PaymentCheckoutResponse>('/payments/create-event-with-payment/', data);
  },

  /**
   * Create event without payment (free submission)
   * Event goes to pending status
   */
  createEventFree: async (data: CreateEventFreeData): Promise<EventCreatedResponse> => {
    return post<EventCreatedResponse>('/payments/create-event-free/', data);
  },

  /**
   * Confirm payment after Stripe redirect
   */
  confirmPayment: async (eventId: number, sessionId?: string): Promise<PaymentConfirmResponse> => {
    return post<PaymentConfirmResponse>('/payments/confirm-payment/', {
      event_id: eventId,
      session_id: sessionId,
    });
  },

  /**
   * Cancel payment flow and remove draft event
   */
  cancelEventPayment: async (eventId: number): Promise<PaymentCancelResponse> => {
    return post<PaymentCancelResponse>('/payments/cancel-event-payment/', {
      event_id: eventId,
    });
  },
};
