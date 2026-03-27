'use client';

import { useEffect, useState, use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, MapPin, QrCode } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import QRCode from 'qrcode';
import { apiClient } from '@/lib/api/client';
import { useAuthStore, useHydration } from '@/stores/authStore';
import toast from 'react-hot-toast';

interface TicketDetail {
  ticket_code: string;
  status: string;
  purchase_date: string;
  ticket_type: { name: string; price: number };
  event: {
    title: string;
    slug: string;
    start_date: string;
    location: { name: string; city: string } | null;
  };
}

interface Props {
  params: Promise<{ ticketCode: string }>;
}

export default function TicketViewPage({ params }: Props) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [redirected, setRedirected] = useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hydrated = useHydration();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Redirect if not authenticated - but wait until user state is loaded
  useEffect(() => {
    if (hydrated && !isAuthenticated && !redirected) {
      setRedirected(true);
      const toastKey = `ticket-view-login-toast:${resolvedParams.ticketCode}`;
      if (typeof window !== 'undefined' && !sessionStorage.getItem(toastKey)) {
        toast.error('Musisz być zalogowany aby przeglądać bilety');
        sessionStorage.setItem(toastKey, '1');
      }
      router.push(`/logowanie?redirect=/bilety/${resolvedParams.ticketCode}`);
    }
  }, [hydrated, isAuthenticated, router, resolvedParams.ticketCode, redirected]);

  const { data, isLoading } = useQuery({
    queryKey: ['ticket-detail', resolvedParams.ticketCode],
    queryFn: async () => {
      const response = await apiClient.get(`/tickets/ticket/${resolvedParams.ticketCode}/`);
      return response.data as TicketDetail;
    },
    enabled: hydrated && isAuthenticated,
  });

  useEffect(() => {
    if (!hydrated || !isAuthenticated) return;
    if (!data?.ticket_code) {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(data.ticket_code, { width: 256, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [data?.ticket_code, hydrated, isAuthenticated]);

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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <QrCode className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900">Podgląd biletu</h1>
          </div>

          {isLoading ? (
            <div className="text-gray-600">Ładowanie biletu...</div>
          ) : data ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center bg-gray-100 rounded">
                    <QrCode className="w-16 h-16 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="text-sm text-gray-600">
                Kod biletu: <span className="font-semibold">{data.ticket_code}</span>
              </div>
              <div className="text-lg font-semibold text-gray-900">{data.event.title}</div>
              <div className="text-gray-600 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500" />
                {format(parseISO(data.event.start_date), 'd MMMM yyyy, HH:mm', { locale: pl })}
              </div>
              {data.event.location && (
                <div className="text-gray-600 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-500" />
                  {data.event.location.name}, {data.event.location.city}
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-600">Nie znaleziono biletu.</div>
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
