'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useAuthStore, useHydration } from '@/stores/authStore';
import toast from 'react-hot-toast';

interface OrderDetail {
  order_number: string;
  status: string;
  total: string;
  created_at: string;
  event: { title: string; slug: string };
  tickets: Array<{ ticket_code: string; ticket_type: { name: string; price: number } }>;
}

interface Props {
  params: Promise<{ orderNumber: string }>;
}

export default function OrderDetailsPage({ params }: Props) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [redirected, setRedirected] = useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hydrated = useHydration();

  // Redirect if not authenticated - but wait until hydration is done
  useEffect(() => {
    if (hydrated && !isAuthenticated && !redirected) {
      setRedirected(true);
      toast.error('Musisz być zalogowany aby przeglądać zamówienia');
      router.push(`/logowanie?redirect=/bilety/zamowienie/${resolvedParams.orderNumber}`);
    }
  }, [hydrated, isAuthenticated, router, resolvedParams.orderNumber, redirected]);

  const { data, isLoading, isRefetching } = useQuery({
    queryKey: ['order-detail', resolvedParams.orderNumber],
    queryFn: async () => {
      const response = await apiClient.get(`/tickets/order/${resolvedParams.orderNumber}/`);
      return response.data as OrderDetail;
    },
    enabled: hydrated && isAuthenticated,
    // Automatyczne sprawdzanie co 2 sekundy gdy status to 'pending'
    refetchInterval: (query) => {
      const order = query.state.data;
      if (order && order.status === 'pending') {
        return 2000; // Sprawdzaj co 2 sekundy
      }
      return false; // Nie sprawdzaj gdy status != pending
    },
  });

  // Show loading while auth store is hydrating
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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900">Szczegóły zamówienia</h1>
          </div>

          {isLoading ? (
            <div className="text-gray-600">Ładowanie zamówienia...</div>
          ) : data ? (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Numer zamówienia: <span className="font-semibold">{data.order_number}</span>
              </div>
              
              {/* Status z animacją dla pending */}
              {data.status === 'pending' ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-yellow-600 border-t-transparent"></div>
                    <div>
                      <div className="text-sm font-medium text-yellow-800">Weryfikacja płatności...</div>
                      <div className="text-xs text-yellow-600">Sprawdzamy status płatności. To może potrwać kilka sekund.</div>
                    </div>
                  </div>
                </div>
              ) : data.status === 'paid' ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-green-800">Płatność potwierdzona</span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-600">Status: {data.status}</div>
              )}
              
              <div className="text-sm text-gray-600">Suma: {data.total} PLN</div>
              <div className="text-sm text-gray-600">Wydarzenie: {data.event.title}</div>
              <div className="flex gap-3">
                <Link
                  href={`/wydarzenia/${data.event.slug}`}
                  className="text-indigo-600 hover:underline"
                >
                  Zobacz wydarzenie
                </Link>
                <Link
                  href={`/bilety/zwrot/${data.order_number}`}
                  className="text-indigo-600 hover:underline"
                >
                  Zgłoś zwrot
                </Link>
              </div>
              <div>
                <div className="font-semibold text-gray-900 mb-2">Bilety</div>
                <ul className="text-sm text-gray-700 space-y-1">
                  {data.tickets.map((t) => (
                    <li key={t.ticket_code}>{t.ticket_type.name} — {t.ticket_code}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-gray-600">Nie znaleziono zamówienia.</div>
          )}

          <div className="mt-6">
            <Link href="/moje-bilety" className="text-indigo-600 hover:underline">
              ← Wróć do moich biletów
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
