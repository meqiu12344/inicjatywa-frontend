import { getPublicApiBaseUrl } from '@/lib/env';
import { useAuthStore } from '@/stores/authStore';

export interface TrackableEvent {
  id: number;
  status?: string;
  organizer_id?: number;
  user?: { id: number };
  promotion_id?: number;
}

let memorySession: string | undefined;

export function trackingSession(): string {
  if (memorySession) return memorySession;
  try {
    const stored = sessionStorage.getItem('ik-event-session');
    if (stored && /^[a-zA-Z0-9_-]{16,64}$/.test(stored)) return memorySession = stored;
  } catch { /* Private browsers can disable storage; the in-memory session still works. */ }
  memorySession = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID() : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
  try { sessionStorage.setItem('ik-event-session', memorySession); } catch { /* Optional persistence. */ }
  return memorySession;
}

export function canTrackEvent(event: TrackableEvent): boolean {
  const user = useAuthStore.getState().user;
  return (!event.status || ['public', 'closed'].includes(event.status))
    && !user?.is_staff && (!user || user.id !== (event.organizer_id ?? event.user?.id));
}

async function send(path: string, data: object): Promise<boolean> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = useAuthStore.getState().tokens?.access;
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload.exp > Date.now() / 1000 + 10) headers.Authorization = `Bearer ${token}`;
      } catch { /* Tracking never refreshes a session or redirects to login. */ }
    }
    const response = await fetch(`${getPublicApiBaseUrl()}/api/statistics/track/${path}/`, {
      method: 'POST', headers, credentials: 'omit', keepalive: true,
      body: JSON.stringify({ ...data, session_id: trackingSession(), referrer: document.referrer.slice(0, 2000) }),
    });
    return response.ok;
  } catch { return false; }
}

export function trackEventView(event: TrackableEvent): Promise<boolean> {
  return canTrackEvent(event) ? send('view', { event_id: event.id }) : Promise.resolve(false);
}

export function trackCard(event: TrackableEvent, type: 'card_impression' | 'card_click'): Promise<boolean> {
  return canTrackEvent(event) ? send('cards', { type, events: [{ event_id: event.id, promotion_id: event.promotion_id }] }) : Promise.resolve(false);
}

export function trackEventInteraction(event: TrackableEvent, type: string): Promise<boolean> {
  return canTrackEvent(event) ? send('interaction', { event_id: event.id, type }) : Promise.resolve(false);
}
