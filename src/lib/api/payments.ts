import { post } from '@/lib/api/client';

export interface CreateEventPaymentData {
  event_data: {
    title: string;
    description: string;
    start_date: string;
    end_date?: string;
    is_permanent: boolean;
    location?: {
      address: string;
      city: string;
      postal_code: string;
      region: string;
    };
    event_type: 'free' | 'voluntary' | 'platform' | 'paid';
    participant_limit?: number | null;
    is_limited: boolean;
    ticket_price?: number | null;
    ticket_url?: string;
    available_from?: string;
    available_to?: string;
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

export const paymentsApi = {
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
