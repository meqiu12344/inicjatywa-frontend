'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ScanLine, CheckCircle, XCircle } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import toast from 'react-hot-toast';

interface Props {
  params: Promise<{ eventId: string }>;
}

export default function TicketScannerPage({ params }: Props) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [redirected, setRedirected] = useState(false);
  const user = useAuthStore((state) => state.user);
  const isOrganizer = useAuthStore((state) => state.can('isOrganizer'));
  const [code, setCode] = useState('');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [ticketInfo, setTicketInfo] = useState<{ ticket_code?: string; ticket_type?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if not organizer - but wait until user state is loaded
  useEffect(() => {
    if (user !== undefined && !isOrganizer && !redirected) {
      setRedirected(true);
      toast.error('Musisz być organizatorem aby używać skanera');
      router.push('/logowanie?redirect=/');
    }
  }, [isOrganizer, router, redirected, user]);

  // Show loading while auth is being checked
  if (user === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Ładowanie...</p>
        </div>
      </div>
    );
  }

  // If not organizer, show nothing (redirect will happen)
  if (!isOrganizer) {
    return null;
  }

  const handleVerify = async () => {
    setIsLoading(true);
    setResult(null);
    setTicketInfo(null);
    try {
      const response = await apiClient.post('/tickets/verify/', {
        code,
        event_id: Number(resolvedParams.eventId),
      });
      setResult({ success: true, message: 'Bilet ważny' });
      setTicketInfo({
        ticket_code: response.data?.ticket_code,
        ticket_type: response.data?.ticket_type,
      });
    } catch (error: any) {
      setResult({
        success: false,
        message: error?.response?.data?.message || 'Niepoprawny bilet',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkUsed = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const response = await apiClient.post('/tickets/mark-used/', { code });
      setResult({ success: response.data?.success, message: response.data?.message || 'Zaktualizowano' });
    } catch (error: any) {
      setResult({
        success: false,
        message: error?.response?.data?.message || 'Nie udało się oznaczyć biletu',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <ScanLine className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900">Skaner biletów</h1>
          </div>

          <div className="space-y-4">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Wpisz lub wklej kod biletu"
              className="w-full border rounded-md px-3 py-2"
            />
            <div className="flex gap-3">
              <button
                onClick={handleVerify}
                disabled={!code || isLoading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md disabled:opacity-50"
              >
                Sprawdź
              </button>
              <button
                onClick={handleMarkUsed}
                disabled={!code || isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md disabled:opacity-50"
              >
                Oznacz jako wykorzystany
              </button>
            </div>

            {result && (
              <div className={`flex items-center gap-2 text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                {result.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                <span>{result.message}</span>
              </div>
            )}

            {ticketInfo && (
              <div className="text-sm text-gray-600">
                {ticketInfo.ticket_code && <div>Kod: {ticketInfo.ticket_code}</div>}
                {ticketInfo.ticket_type && <div>Typ: {ticketInfo.ticket_type}</div>}
              </div>
            )}
          </div>

          <div className="mt-6">
            <Link href="/moje-wydarzenia" className="text-indigo-600 hover:underline">
              ← Wróć do moich wydarzeń
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
