'use client';

import { useMemo, useState, useEffect, use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Ticket, Calendar, MapPin } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { apiClient } from '@/lib/api/client';
import { useAuthStore, useHydration } from '@/stores/authStore';
import toast from 'react-hot-toast';

interface TicketType {
  id: number;
  name: string;
  description?: string;
  price: string;
  quantity_available: number;
  sales_start?: string;
  sales_end?: string;
  sales_status: string;
  is_on_sale: boolean;
  is_sold_out: boolean;
}

interface EventSummary {
  id: number;
  title: string;
  slug: string;
  start_date: string;
  image_url: string | null;
  location: { name: string; city: string } | null;
}

interface TicketsResponse {
  event: EventSummary;
  ticket_types: TicketType[];
}

interface Props {
  params: Promise<{ eventId: string }>;
}

export default function EventTicketsPage({ params }: Props) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [redirected, setRedirected] = useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hydrated = useHydration();

  // Redirect if not authenticated - but wait until user state is loaded
  useEffect(() => {
    // If user is defined (either logged in or not), we know auth is ready
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

  const { data, isLoading } = useQuery({
    queryKey: ['ticket-types', resolvedParams.eventId],
    queryFn: async () => {
      const response = await apiClient.get(`/tickets/event/${resolvedParams.eventId}/types/`);
      return response.data as TicketsResponse;
    },
    enabled: hydrated && isAuthenticated,
  });

  const total = useMemo(() => {
    if (!data) return 0;
    return data.ticket_types.reduce((sum, tt) => {
      const qty = quantities[tt.id] || 0;
      return sum + qty * parseFloat(tt.price);
    }, 0);
  }, [data, quantities]);

  const isWithinSaleWindow = (tt: TicketType) => {
    // Use the backend-provided is_on_sale field (avoids timezone issues)
    return tt.is_on_sale;
  };

  const getSalesStatusLabel = (tt: TicketType) => {
    if (tt.is_on_sale) return null;
    const now = Date.now();
    if (tt.sales_start) {
      const start = Date.parse(tt.sales_start);
      if (!Number.isNaN(start) && now < start) {
        return `Sprzedaż startuje: ${format(new Date(start), 'd MMMM yyyy, HH:mm', { locale: pl })}`;
      }
    }
    if (tt.sales_end) {
      const end = Date.parse(tt.sales_end);
      if (!Number.isNaN(end) && now > end) {
        return `Sprzedaż zakończona: ${format(new Date(end), 'd MMMM yyyy, HH:mm', { locale: pl })}`;
      }
    }
    return 'Sprzedaż niedostępna';
  };

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

  const handleQuantityChange = (ticketTypeId: number, value: number) => {
    setQuantities((prev) => ({
      ...prev,
      [ticketTypeId]: Math.max(0, value),
    }));
  };

  const handleProceed = () => {
    const items = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([ticketTypeId, qty]) => ({
        ticket_type_id: Number(ticketTypeId),
        quantity: qty,
      }));

    localStorage.setItem(
      `ticketSelections:${resolvedParams.eventId}`,
      JSON.stringify(items)
    );
    router.push(`/bilety/zakup/${resolvedParams.eventId}/finalizuj`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <Ticket className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900">Bilety na wydarzenie</h1>
          </div>

          {isLoading ? (
            <div className="text-gray-600">Ładowanie biletów...</div>
          ) : data ? (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">{data.event.title}</h2>
                <div className="mt-2 space-y-2 text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <span>
                      {format(parseISO(data.event.start_date), 'd MMMM yyyy, HH:mm', { locale: pl })}
                    </span>
                  </div>
                  {data.event.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-indigo-500" />
                      <span>
                        {data.event.location.name}, {data.event.location.city}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {data.ticket_types.map((tt) => (
                  <div key={tt.id} className="border rounded-lg p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <div className="text-lg font-semibold text-gray-900">{tt.name}</div>
                        {tt.description && (
                          <div className="text-sm text-gray-600 mt-1">{tt.description}</div>
                        )}
                        <div className="text-sm text-gray-500 mt-1">
                          Dostępne: {tt.quantity_available}
                        </div>
                        {!isWithinSaleWindow(tt) && getSalesStatusLabel(tt) && (
                          <div className="text-xs text-amber-700 mt-2">
                            {getSalesStatusLabel(tt)}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-lg font-bold text-gray-900">{tt.price} PLN</div>
                        <input
                          type="number"
                          min={0}
                          max={tt.quantity_available}
                          value={quantities[tt.id] || 0}
                          onChange={(e) => handleQuantityChange(tt.id, Number(e.target.value))}
                          className="w-20 border rounded-md px-2 py-1"
                          disabled={tt.is_sold_out || tt.quantity_available <= 0 || !isWithinSaleWindow(tt)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="text-lg font-semibold">Suma: {total.toFixed(2)} PLN</div>
                <button
                  onClick={handleProceed}
                  disabled={total <= 0}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-md disabled:opacity-50"
                >
                  Przejdź do płatności
                </button>
              </div>
            </>
          ) : (
            <div className="text-gray-600">Nie udało się pobrać biletów.</div>
          )}

          <div className="flex gap-4 mt-6">
            <Link href={`/wydarzenia/${data?.event.slug || ''}`} className="text-indigo-600 hover:underline">
              ← Wróć do wydarzenia
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
