'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Calendar, CheckCircle, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { paymentsApi } from '@/lib/api/payments';
import { getErrorMessage } from '@/lib/api/client';
import { useHydration } from '@/stores/authStore';

const formatDate = (value: string) => new Intl.DateTimeFormat('pl-PL', {
  dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Warsaw',
}).format(new Date(value));

export default function PromotionConfirmation({ promotionId, sessionId }: {
  promotionId: string | null;
  sessionId: string | null;
}) {
  const hydrated = useHydration();
  const [pollingUntil, setPollingUntil] = useState(() => Date.now() + 30000);
  const [pollingExpired, setPollingExpired] = useState(false);
  const validId = !!promotionId && /^\d+$/.test(promotionId);
  const { data, error, isFetching, refetch } = useQuery({
    queryKey: ['promotion-confirmation', promotionId, sessionId],
    queryFn: () => paymentsApi.confirmPromotion(promotionId!, sessionId),
    enabled: hydrated && validId,
    staleTime: 0,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => query.state.data?.status === 'pending' && Date.now() < pollingUntil
      ? 3000 : false,
  });

  useEffect(() => {
    const timer = setTimeout(() => setPollingExpired(true), Math.max(0, pollingUntil - Date.now()));
    return () => clearTimeout(timer);
  }, [pollingUntil]);

  const active = data?.status === 'active';
  const pending = data?.status === 'pending';
  const loading = validId && !data && !error;
  const waiting = pending && !pollingExpired;
  const Icon = loading || waiting ? Loader2 : active ? CheckCircle : AlertCircle;
  const title = loading ? 'Potwierdzanie zakupu promocji…'
    : active ? `Promocja ${data.level_display} została aktywowana`
    : pending ? 'Czekamy na potwierdzenie płatności'
    : data?.payment_status === 'paid' ? `Zakup promocji ${data.level_display} potwierdzony`
    : 'Nie udało się potwierdzić aktywacji promocji';

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4 py-12">
      <section className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center" aria-labelledby="promotion-heading">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${active ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
          <Icon className={`w-12 h-12 ${loading || waiting ? 'animate-spin' : ''}`} aria-hidden="true" />
        </div>
        <div role="status" aria-live="polite">
          <h1 id="promotion-heading" className="text-2xl font-bold text-gray-900 mb-3">{title}</h1>
          {active && <p className="text-gray-600 mb-6">Dziękujemy za zakup. Promocja została zapisana i jest już aktywna w IK.</p>}
          {pending && <p className="text-gray-600 mb-6">Potwierdzenie ze Stripe może potrwać chwilę. Nie musisz ponownie kupować promocji. {waiting && 'Status odświeży się automatycznie.'}</p>}
          {(!validId || error) && <p className="text-gray-600 mb-6">{!validId
            ? 'Brak identyfikatora zakupionej promocji. Sprawdź zakup w panelu Moje wydarzenia.'
            : getErrorMessage(error, 'Nie udało się pobrać potwierdzenia. Sprawdź status ponownie za chwilę.')}</p>}
        </div>

        {data && (
          <dl className="my-6 rounded-xl border border-gray-200 bg-gray-50 p-5 text-left space-y-4">
            <div><dt className="text-sm text-gray-500">Wydarzenie</dt><dd className="font-semibold text-gray-900 break-words">{data.event_title}</dd></div>
            <div><dt className="text-sm text-gray-500">Pakiet promocji</dt><dd className="font-semibold text-gray-900">{data.level_display}</dd></div>
            <div><dt className="text-sm text-gray-500">Status promocji</dt><dd className={`font-semibold ${active ? 'text-green-700' : 'text-gray-900'}`}>{data.status_display}</dd></div>
            {data.payment_status === 'paid' && <>
              <div><dt className="text-sm text-gray-500">Okres promocji OD</dt><dd className="text-gray-900"><time dateTime={data.start_date}>{formatDate(data.start_date)}</time></dd></div>
              <div><dt className="text-sm text-gray-500">Okres promocji DO</dt><dd className="text-gray-900"><time dateTime={data.end_date}>{formatDate(data.end_date)}</time></dd></div>
            </>}
          </dl>
        )}

        <div className="space-y-3">
          {validId && !active && !loading && <button
            type="button" disabled={isFetching}
            onClick={() => { setPollingExpired(false); setPollingUntil(Date.now() + 30000); void refetch(); }}
            className="flex items-center justify-center gap-2 w-full px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium"
          ><RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />Sprawdź status ponownie</button>}
          {data && <Link href={`/wydarzenia/${data.event_slug}-${data.event_id}`} className="flex items-center justify-center gap-2 w-full px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            <ExternalLink className="w-5 h-5" aria-hidden="true" />Zobacz wydarzenie
          </Link>}
          <Link href="/moje-wydarzenia" className="flex items-center justify-center gap-2 w-full px-5 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
            <Calendar className="w-5 h-5" aria-hidden="true" />Moje wydarzenia
          </Link>
        </div>
      </section>
    </div>
  );
}
