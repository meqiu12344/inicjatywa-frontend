import { getBackendUrl, getPublicApiBaseUrl } from '@/lib/env';

export const NEWSLETTER_ARCHIVE_PATH = '/newsletter/archiwum';

export interface NewsletterSummary {
  id: number;
  title: string;
  sent_at: string | null;
  newsletter_type: string;
}

export interface NewsletterArchive {
  newsletters: NewsletterSummary[];
  count: number;
  page: number;
  total_pages: number;
}

export interface ArchivedNewsletter extends NewsletterSummary {
  content: string;
}

export interface SubscriptionConfirmation {
  message: string;
  email?: string;
  already_confirmed?: boolean;
  archive_url: string;
}

export class NewsletterApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'NewsletterApiError';
  }
}

// Publiczne newslettery i linki z maila nie wymagają sesji konta ani dostępu do localStorage.
async function request<T>(path: string, body?: unknown): Promise<T> {
  const base = typeof window === 'undefined' ? getBackendUrl() : getPublicApiBaseUrl();
  const response = await fetch(`${base}/api/newsletter/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'omit',
    cache: 'no-store',
    headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new NewsletterApiError(response.status, data?.error || data?.detail || data?.email?.[0] || 'Nie udało się pobrać danych newslettera. Spróbuj ponownie.');
  }
  if (!data) throw new Error('Empty newsletter API response');
  return data as T;
}

export const newsletterApi = {
  archive: (page = 1) => request<NewsletterArchive>(`archive/?page=${page}`),
  detail: (id: string) => request<ArchivedNewsletter>(`archive/${encodeURIComponent(id)}/`),
  confirm: (token: string) => request<SubscriptionConfirmation>(`confirm/${encodeURIComponent(token)}/`, {}),
  subscribe: (data: { email: string; categories: number[] }) => request<{ message: string }>('subscribe/', data),
  quickSubscribe: (email: string) => request<{ message: string }>('quick-subscribe/', { email }),
};
