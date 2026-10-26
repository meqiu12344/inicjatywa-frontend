'use client';

import { useState } from 'react';
import { Ban, BadgeCheck, LockOpen, ShieldCheck, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { adminApi, OrganizerRequest, OrganizerTrustLevel } from '@/lib/api/admin';
import { getErrorMessage } from '@/lib/api/client';

export type OrganizerTrustState = Pick<OrganizerRequest, 'trust_level' | 'is_trusted' | 'is_verified' | 'trusted_at' | 'account_active'>;

interface OrganizerTrustPanelProps {
  request: OrganizerTrustState & { id: number; status: string };
  onUpdated: (changes: OrganizerTrustState) => void;
}

const LEVELS: { value: OrganizerTrustLevel; label: string; description: string; icon: typeof ShieldCheck }[] = [
  { value: 'new', label: 'Nowy', description: 'Każde wydarzenie trafia do moderacji.', icon: UserRound },
  { value: 'verified', label: 'Zweryfikowany', description: 'Odznaka na profilu. Wydarzenia nadal trafiają do moderacji.', icon: BadgeCheck },
  { value: 'trusted', label: 'Zaufany Organizator', description: 'Wydarzenia są publikowane od razu, bez kolejki moderacyjnej.', icon: ShieldCheck },
];

// Poziom zaufania i blokada konta — dostępne dopiero po zatwierdzeniu wniosku.
export default function OrganizerTrustPanel({ request, onUpdated }: OrganizerTrustPanelProps) {
  const [busy, setBusy] = useState(false);
  if (request.status !== 'approved') return null;

  const run = async (action: () => Promise<{ message: string; request: OrganizerRequest }>, fallback: string) => {
    setBusy(true);
    try {
      const { message, request: updated } = await action();
      toast.success(message);
      onUpdated({
        trust_level: updated.trust_level, is_trusted: updated.is_trusted, is_verified: updated.is_verified,
        trusted_at: updated.trusted_at, account_active: updated.account_active,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, fallback));
    } finally {
      setBusy(false);
    }
  };

  const setLevel = (level: OrganizerTrustLevel) => {
    if (level === request.trust_level) return;
    if (level === 'trusted' && !confirm('Wydarzenia tego organizatora będą publikowane bez moderacji. Kontynuować?')) return;
    void run(() => adminApi.setOrganizerTrustLevel(request.id, level), 'Nie udało się zmienić poziomu zaufania');
  };

  const toggleBlocked = () => {
    const blocked = request.account_active;
    if (blocked && !confirm('Zablokować konto? Organizator nie zaloguje się, a status Zaufanego Organizatora zostanie odebrany.')) return;
    void run(() => adminApi.setOrganizerAccountBlocked(request.id, blocked), 'Nie udało się zmienić blokady konta');
  };

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4" aria-labelledby={`trust-${request.id}`}>
      <h4 id={`trust-${request.id}`} className="text-sm font-semibold text-gray-900">Moderacja wydarzeń</h4>
      <div role="radiogroup" aria-labelledby={`trust-${request.id}`} className="mt-3 space-y-2">
        {LEVELS.map(({ value, label, description, icon: Icon }) => {
          const active = request.trust_level === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={busy || (value === 'trusted' && !request.account_active)}
              onClick={() => setLevel(value)}
              className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                active ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${active ? 'text-indigo-600' : 'text-gray-400'}`} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-gray-900">{label}</span>
                <span className="block text-xs text-gray-600">{description}</span>
              </span>
            </button>
          );
        })}
      </div>
      {request.is_trusted && request.trusted_at && (
        <p className="mt-2 text-xs text-gray-500">
          Zaufany od {format(new Date(request.trusted_at), 'd MMM yyyy, HH:mm', { locale: pl })}
        </p>
      )}

      <button
        type="button"
        onClick={toggleBlocked}
        disabled={busy}
        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
          request.account_active ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-green-200 text-green-700 hover:bg-green-50'
        }`}
      >
        {request.account_active ? <Ban className="h-4 w-4" aria-hidden="true" /> : <LockOpen className="h-4 w-4" aria-hidden="true" />}
        {request.account_active ? 'Zablokuj konto' : 'Odblokuj konto'}
      </button>
      {!request.account_active && (
        <p className="mt-2 text-xs text-red-700">Konto jest zablokowane — organizator nie może się zalogować.</p>
      )}
    </section>
  );
}
