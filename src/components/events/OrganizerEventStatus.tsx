import { CheckCircle, Clock, EyeOff, FileText, Lock, AlertCircle, CalendarCheck } from 'lucide-react';
import { getOrganizerStatus, type OrganizerEvent } from '@/lib/organizerStatus';
import { PromotionStatus } from './PromotionStatus';

export function OrganizerEventStatus({ event, dark = false }: { event: OrganizerEvent; dark?: boolean }) {
  const status = getOrganizerStatus(event);
  const Icon = {
    public: CheckCircle, pending: Clock, ai_draft: Clock, rejected: AlertCircle,
    ended: CalendarCheck, draft: FileText, hidden: EyeOff, closed: Lock, unknown: AlertCircle,
  }[status.code];
  const color = status.code === 'public'
    ? dark ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10' : 'border-emerald-200 text-emerald-800 bg-emerald-50'
    : status.code === 'rejected'
      ? dark ? 'border-red-500/40 text-red-300 bg-red-500/10' : 'border-red-200 text-red-800 bg-red-50'
      : status.code === 'pending' || status.code === 'ai_draft'
        ? dark ? 'border-amber-500/40 text-amber-300 bg-amber-500/10' : 'border-amber-200 text-amber-800 bg-amber-50'
        : dark ? 'border-gray-600 text-gray-200 bg-gray-700/40' : 'border-gray-200 text-gray-700 bg-gray-50';
  return (
    <section aria-label="Status wydarzenia" className={`rounded-xl border p-4 space-y-3 ${dark ? 'border-gray-600 bg-gray-900/40' : 'border-gray-200 bg-white'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-sm font-medium ${dark ? 'text-gray-300' : 'text-gray-600'}`}>Status wydarzenia:</span>
        <strong className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${color}`}>
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />{status.label}
        </strong>
      </div>
      <p className={`text-sm ${dark ? 'text-gray-300' : 'text-gray-600'}`}>{status.description}</p>
      {status.rejection_reason && (
        <div className={`rounded-lg border p-3 text-sm ${dark ? 'border-red-500/30 text-red-200' : 'border-red-200 text-red-900 bg-red-50'}`}>
          <p className="font-semibold">Uwagi moderatora</p>
          <p className="mt-1 whitespace-pre-wrap break-words">{status.rejection_reason}</p>
        </div>
      )}
      <PromotionStatus promotion={event.promotion} eventStatus={status.code === 'public' ? 'public' : 'hidden'} dark={dark} />
    </section>
  );
}
