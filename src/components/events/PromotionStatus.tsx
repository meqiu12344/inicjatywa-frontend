import { Clock, Sparkles } from 'lucide-react';
import type { EventStatus, PromotionStatus as PromotionStatusData } from '@/types';

const dateFormatter = new Intl.DateTimeFormat('pl-PL', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw',
});

export function PromotionStatus({ promotion, eventStatus, dark = false }: {
  promotion?: PromotionStatusData | null;
  eventStatus?: EventStatus;
  dark?: boolean;
}) {
  const muted = dark ? 'text-gray-300' : 'text-gray-600';
  if (!promotion) return <p className={`text-sm ${muted}`}>Brak promocji</p>;

  const active = promotion.status === 'active';
  const paid = promotion.payment_status === 'paid';
  return (
    <section aria-label="Promocja wydarzenia" className={`rounded-xl border p-4 text-sm ${dark ? 'border-gray-600 bg-gray-900/60 text-white' : 'border-gray-200 bg-white text-gray-900'}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className={`flex items-center gap-2 font-bold ${active ? dark ? 'text-amber-300' : 'text-amber-800' : ''}`}>
          <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
          {active ? 'PROMOWANE' : 'PROMOCJA'} — {promotion.level_display.toUpperCase()}
        </p>
        <p className={active ? dark ? 'text-emerald-300' : 'text-emerald-700' : muted}>
          <span className="sr-only">Status promocji: </span>{promotion.status_display}
        </p>
      </div>
      {paid ? (
        <dl className={`mt-3 flex flex-wrap gap-x-6 gap-y-2 ${muted}`}>
          <div><dt className="inline">Aktywna od: </dt><dd className="inline font-medium"><time dateTime={promotion.start_date}>{dateFormatter.format(new Date(promotion.start_date))}</time></dd></div>
          <div><dt className="inline">{active || promotion.status === 'scheduled' ? 'Aktywna do: ' : 'Koniec okresu: '}</dt><dd className="inline font-medium"><time dateTime={promotion.end_date}>{dateFormatter.format(new Date(promotion.end_date))}</time></dd></div>
        </dl>
      ) : (
        <p className={`mt-2 flex items-start gap-2 ${muted}`}><Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {promotion.status === 'pending'
            ? 'Promocja uruchomi się po potwierdzeniu płatności. Okres aktywności pojawi się po aktywacji.'
            : 'Promocja nie jest aktywna. Sprawdź status zakupu przed ponowieniem płatności.'}
        </p>
      )}
      {active && eventStatus && eventStatus !== 'public' && <p className={`mt-2 ${muted}`}>Ekspozycja na portalu wymaga opublikowanego wydarzenia.</p>}
    </section>
  );
}
