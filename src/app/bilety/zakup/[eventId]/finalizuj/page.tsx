'use client';

import { useEffect, useMemo, useState, use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CreditCard } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useAuthStore, useHydration } from '@/stores/authStore';
import toast from 'react-hot-toast';

interface TicketType {
  id: number;
  name: string;
  price: string;
}

interface TicketsResponse {
  event: { id: number; title: string; slug: string };
  ticket_types: TicketType[];
}

interface Props {
  params: Promise<{ eventId: string }>;
}

export default function CheckoutPage({ params }: Props) {
  const resolvedParams = use(params);
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hydrated = useHydration();
  const [items, setItems] = useState<Array<{ ticket_type_id: number; quantity: number }>>([]);
  const [formData, setFormData] = useState({
    email: user?.email || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [redirected, setRedirected] = useState(false);

  // Redirect if not authenticated - but wait until user state is loaded
  useEffect(() => {
    if (hydrated && !isAuthenticated && !redirected) {
      setRedirected(true);
      const toastKey = `ticket-login-toast:${resolvedParams.eventId}`;
      if (typeof window !== 'undefined' && !sessionStorage.getItem(toastKey)) {
        toast.error('Musisz być zalogowany aby kupić bilety');
        sessionStorage.setItem(toastKey, '1');
      }
      router.push(`/logowanie?redirect=/bilety/zakup/${resolvedParams.eventId}`);
    }
  }, [hydrated, isAuthenticated, redirected, router, resolvedParams.eventId]);

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        email: user.email || prev.email,
        first_name: user.first_name || prev.first_name,
        last_name: user.last_name || prev.last_name,
      }));
    }
  }, [user]);

  const { data } = useQuery({
    queryKey: ['ticket-types', resolvedParams.eventId],
    queryFn: async () => {
      const response = await apiClient.get(`/tickets/event/${resolvedParams.eventId}/types/`);
      return response.data as TicketsResponse;
    },
    enabled: hydrated && isAuthenticated,
  });

  useEffect(() => {
    if (!hydrated || !isAuthenticated) return;
    const stored = localStorage.getItem(`ticketSelections:${resolvedParams.eventId}`);
    if (!stored) {
      router.replace(`/bilety/zakup/${resolvedParams.eventId}`);
      return;
    }
    try {
      const parsed = JSON.parse(stored) as Array<{ ticket_type_id: number; quantity: number }>;
      setItems(parsed);
    } catch {
      router.replace(`/bilety/zakup/${resolvedParams.eventId}`);
    }
  }, [hydrated, isAuthenticated, resolvedParams.eventId, router]);

  const total = useMemo(() => {
    if (!data) return 0;
    return items.reduce((sum, item) => {
      const tt = data.ticket_types.find((t) => t.id === item.ticket_type_id);
      if (!tt) return sum;
      return sum + item.quantity * parseFloat(tt.price);
    }, 0);
  }, [data, items]);

  // Show loading while auth is being checked
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Ładowanie...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show nothing (redirect will happen)
  if (!isAuthenticated) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const response = await apiClient.post(`/tickets/event/${resolvedParams.eventId}/checkout/`, {
        ...formData,
        items,
      });
      const { checkout_url } = response.data as { checkout_url: string };
      window.location.href = checkout_url;
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message || 'Nie udało się utworzyć płatności.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <CreditCard className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900">Finalizacja zakupu</h1>
          </div>

          {data && (
            <div className="mb-6">
              <div className="text-lg font-semibold text-gray-900">{data.event.title}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="border rounded-md px-3 py-2"
                required
              />
              <input
                type="text"
                placeholder="Telefon"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="border rounded-md px-3 py-2"
              />
              <input
                type="text"
                placeholder="Imię"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="border rounded-md px-3 py-2"
                required
              />
              <input
                type="text"
                placeholder="Nazwisko"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="border rounded-md px-3 py-2"
                required
              />
            </div>

            <div className="border rounded-lg p-4">
              <div className="font-semibold text-gray-900 mb-2">Podsumowanie</div>
              <ul className="space-y-2 text-sm text-gray-700">
                {items.map((item) => {
                  const tt = data?.ticket_types.find((t) => t.id === item.ticket_type_id);
                  if (!tt) return null;
                  return (
                    <li key={tt.id} className="flex justify-between">
                      <span>{tt.name} × {item.quantity}</span>
                      <span>{(item.quantity * parseFloat(tt.price)).toFixed(2)} PLN</span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-4 font-semibold text-gray-900">Razem: {total.toFixed(2)} PLN</div>
            </div>

            {errorMessage && (
              <div className="text-red-600 text-sm">{errorMessage}</div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || items.length === 0}
              className="px-6 py-2 bg-indigo-600 text-white rounded-md disabled:opacity-50"
            >
              {isSubmitting ? 'Przekierowanie...' : 'Przejdź do płatności'}
            </button>
          </form>

          <div className="flex gap-4 mt-6">
            <Link href={`/bilety/zakup/${resolvedParams.eventId}`} className="text-indigo-600 hover:underline">
              ← Wróć do wyboru biletów
            </Link>
            <Link href="/moje-bilety" className="text-indigo-600 hover:underline">
              Moje bilety
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
