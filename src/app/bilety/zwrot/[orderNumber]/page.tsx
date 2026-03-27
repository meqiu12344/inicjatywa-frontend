'use client';

import { useState, useEffect, use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RotateCcw } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useAuthStore, useHydration } from '@/stores/authStore';
import toast from 'react-hot-toast';

interface Props {
  params: Promise<{ orderNumber: string }>;
}

interface OrderDetail {
  order_number: string;
  status: string;
  total: string;
  event: { title: string; slug: string };
}

export default function RefundRequestPage({ params }: Props) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [redirected, setRedirected] = useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hydrated = useHydration();
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if not authenticated - but wait until hydration is done
  useEffect(() => {
    if (hydrated && !isAuthenticated && !redirected) {
      setRedirected(true);
      toast.error('Musisz być zalogowany aby zlecić zwrot');
      router.push(`/logowanie?redirect=/bilety/zwrot/${resolvedParams.orderNumber}`);
    }
  }, [hydrated, isAuthenticated, router, resolvedParams.orderNumber, redirected]);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order-detail', resolvedParams.orderNumber],
    queryFn: async () => {
      const response = await apiClient.get(`/tickets/order/${resolvedParams.orderNumber}/`);
      return response.data as OrderDetail;
    },
    enabled: hydrated && isAuthenticated,
  });

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
    setMessage(null);
    try {
      const response = await apiClient.post(`/tickets/refund/${resolvedParams.orderNumber}/`, {
        reason,
        notes,
      });
      setMessage(response.data?.message || 'Zwrot został zlecony.');
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'Nie udało się zlecić zwrotu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <RotateCcw className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900">Zwrot biletów</h1>
          </div>

          {isLoading ? (
            <div className="text-gray-600 mb-4">Ładowanie zamówienia...</div>
          ) : order ? (
            <div className="text-sm text-gray-600 mb-4">
              Zamówienie: <span className="font-semibold">{order.order_number}</span> · Status: {order.status} · Suma: {order.total} PLN
            </div>
          ) : (
            <div className="text-gray-600 mb-4">Nie znaleziono zamówienia.</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Powód zwrotu"
              className="w-full border rounded-md px-3 py-2"
              required
            />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Dodatkowe informacje (opcjonalnie)"
              className="w-full border rounded-md px-3 py-2"
              rows={4}
            />
            <button
              type="submit"
              disabled={isSubmitting || !order || order.status !== 'paid'}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md disabled:opacity-50"
            >
              {isSubmitting ? 'Wysyłanie...' : 'Wyślij prośbę o zwrot'}
            </button>
          </form>

          {message && (
            <div className="mt-4 text-sm text-gray-700">{message}</div>
          )}

          <div className="mt-6">
            <Link href="/moje-bilety" className="text-indigo-600 hover:underline">
              ← Wróć do moich biletów
            </Link>
            {order && (
              <span className="ml-4">
                <Link href={`/bilety/zamowienie/${order.order_number}`} className="text-indigo-600 hover:underline">
                  Zobacz zamówienie
                </Link>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
