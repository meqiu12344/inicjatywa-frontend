'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Home, Calendar, Loader2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { paymentsApi } from '@/lib/api/payments';
import { useAuthStore } from '@/stores/authStore';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  
  const eventId = searchParams.get('event_id');
  const paymentType = searchParams.get('type');
  const sessionId = searchParams.get('session_id');
  const promotionLevel = searchParams.get('level');
  const isUpgrade = searchParams.get('is_upgrade') === '1';
  
  const [isConfirming, setIsConfirming] = useState(false);
  const [eventSlug, setEventSlug] = useState<string | null>(null);

  useEffect(() => {
    // Confirm payment with backend
    const confirmPayment = async () => {
      if (paymentType === 'promotion') return;
      if (!eventId || !isAuthenticated) return;
      
      setIsConfirming(true);
      try {
        const response = await paymentsApi.confirmPayment(
          parseInt(eventId), 
          sessionId || undefined
        );
        setEventSlug(response.event_slug);
      } catch (error) {
        console.error('Failed to confirm payment:', error);
        toast.error('Nie udało się potwierdzić płatności. Skontaktuj się z nami.');
      } finally {
        setIsConfirming(false);
      }
    };

    confirmPayment();
  }, [eventId, sessionId, isAuthenticated, paymentType]);

  const isAiPoster = paymentType === 'ai_poster';
  const isPromotion = paymentType === 'promotion';

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {isConfirming ? (
          <div className="space-y-4">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto" />
            <h1 className="text-xl font-bold text-gray-900">Potwierdzanie płatności...</h1>
          </div>
        ) : (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {isPromotion
                ? isUpgrade
                  ? 'Promocja ulepszona!'
                  : 'Promocja aktywowana!'
                : 'Płatność przyjęta!'}
            </h1>
            
            <p className="text-gray-600 mb-6">
              {isPromotion ? (
                isUpgrade ? (
                  <>
                    Twoja promocja została pomyślnie ulepszona do pakietu{' '}
                    <strong>{promotionLevel?.toUpperCase() || 'WYŻSZEGO'}</strong>.{' '}
                    Poprzednia promocja została dezaktywowana — nowy pakiet działa od teraz.
                  </>
                ) : (
                  <>
                    Dziękujemy za zakup promocji wydarzenia. Pakiet{' '}
                    <strong>{promotionLevel?.toUpperCase() || 'PROMOCJI'}</strong>{' '}
                    został aktywowany i Twoje wydarzenie zyskuje większą widoczność.
                  </>
                )
              ) : isAiPoster ? (
                <>
                  Dziękujemy za zamówienie plakatu! Twoje wydarzenie zostało zapisane 
                  ze statusem <strong>&quot;Oczekujące&quot;</strong>. Plakat zostanie 
                  stworzony w ciągu 4-5 dni roboczych.
                </>
              ) : (
                <>
                  Dziękujemy za Twoje wsparcie! Twoje wydarzenie zostało zapisane 
                  i czeka na zatwierdzenie przez administratora.
                </>
              )}
            </p>

            {isPromotion && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-emerald-800">
                  <strong>Co dalej?</strong>
                  <br />
                  {isUpgrade
                    ? 'Twoje wydarzenie ma teraz lepszą widoczność. Sprawdź statystyki w panelu organizatora.'
                    : 'Sprawdź status promocji w panelu organizatora. Jeśli zmienisz plan, promocja zostanie automatycznie zaktualizowana.'}
                </p>
              </div>
            )}

            {!isPromotion && isAiPoster && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-amber-800">
                  <strong>Co dalej?</strong>
                  <br />
                  Nasz zespół graficzny stworzy spersonalizowany plakat dla Twojego wydarzenia. 
                  Po jego akceptacji, status wydarzenia zmieni się na &quot;Opublikowane&quot;.
                </p>
              </div>
            )}
            
            <div className="space-y-3">
              <Link 
                href="/moje-wydarzenia"
                className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Calendar className="w-5 h-5" />
                Moje wydarzenia
              </Link>
              
              <Link 
                href="/"
                className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                <Home className="w-5 h-5" />
                Strona główna
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-b from-green-50 to-white" />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
