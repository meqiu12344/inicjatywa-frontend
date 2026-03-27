'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { XCircle, ArrowLeft, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { paymentsApi } from '@/lib/api/payments';
import { useAuthStore } from '@/stores/authStore';

function PaymentCancelContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event_id');
  const { isAuthenticated } = useAuthStore();
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    const cancelDraft = async () => {
      if (!eventId || !isAuthenticated) return;

      setIsCancelling(true);
      try {
        await paymentsApi.cancelEventPayment(parseInt(eventId, 10));
      } catch (error) {
        console.error('Failed to cancel event payment:', error);
        toast.error('Nie udało się anulować szkicu wydarzenia. Skontaktuj się z obsługą.');
      } finally {
        setIsCancelling(false);
      }
    };

    cancelDraft();
  }, [eventId, isAuthenticated]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-12 h-12 text-red-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Płatność anulowana
        </h1>
        
        <p className="text-gray-600 mb-6">
          Płatność została anulowana. Szkic wydarzenia został usunięty.
          Możesz wrócić do formularza i spróbować ponownie.
        </p>

        {isCancelling && (
          <p className="text-sm text-gray-500 mb-4">
            Czyszczenie szkicu wydarzenia...
          </p>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
          <p className="text-sm text-yellow-800">
            <strong>Uwaga:</strong> Jeśli chcesz dokończyć dodawanie wydarzenia, 
            możesz wrócić do formularza i ponowić proces płatności.
          </p>
        </div>
        
        <div className="space-y-3">
          <Link 
            href="/wydarzenia/dodaj"
            className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Dodaj wydarzenie ponownie
          </Link>
          
          <Link 
            href="/"
            className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Wróć na stronę główną
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentCancelPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-b from-red-50 to-white" />}>
      <PaymentCancelContent />
    </Suspense>
  );
}
