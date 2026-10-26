'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import {
  Bot,
  Calendar,
  CheckCircle,
  XCircle,
  MapPin,
  User,
  Tag,
  ExternalLink,
  Pencil,
  Wallet,
  ImageOff,
  AlertTriangle,
  CheckSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { adminApi, PendingEvent, PendingEventStats, AIImportInfo } from '@/lib/api/admin';
import { getRemoteLabel } from '@/lib/eventUtils';
import { getErrorMessage } from '@/lib/api/client';
import { OrganizerContactDetails, OrganizerStatusSelect } from './organizerContact';

const ORGANIZER_MATCH_LABELS: Record<Exclude<AIImportInfo['organizer_match'], ''>, string> = {
  created: 'Nowy organizator w bazie',
  email: 'Powiązano z istniejącym organizatorem (ten sam e-mail)',
  website: 'Powiązano z istniejącym organizatorem (ta sama strona)',
  name: 'Powiązano z istniejącym organizatorem (ta sama nazwa)',
  account: 'Organizator ma już konto na portalu',
};

const MISSING_LABELS: Record<string, string> = {
  start_time: 'godzina rozpoczęcia',
  end_time: 'godzina zakończenia',
  location: 'miejsce',
  online_url: 'link do transmisji',
  organizer_name: 'organizator',
  price: 'cena',
  currency: 'waluta inna niż PLN',
  categories: 'kategorie',
};

const DATA_STATUS: Record<AIImportInfo['data_status'], { icon: string; label: string; className: string }> = {
  complete: { icon: '🟢', label: 'Kompletne', className: 'bg-green-50 text-green-800 border-green-200' },
  incomplete: { icon: '🟡', label: 'Braki', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  conflict: { icon: '🔴', label: 'Konflikt / możliwy duplikat', className: 'bg-red-50 text-red-800 border-red-200' },
};

function DataStatusBadge({ status }: { status: AIImportInfo['data_status'] }) {
  const style = DATA_STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${style.className}`}>
      {style.icon} {style.label}
    </span>
  );
}

function formatDate(event: PendingEvent) {
  const missing = event.ai_import?.missing_fields ?? [];
  const start = new Date(event.start_date);
  const startText = missing.includes('start_time')
    ? `${format(start, 'd MMM yyyy', { locale: pl })}, godzina nieznana`
    : format(start, 'd MMM yyyy, HH:mm', { locale: pl });
  if (!event.end_date) return startText;
  const end = new Date(event.end_date);
  const endText = event.end_time_unknown
    ? format(end, 'd MMM yyyy', { locale: pl })
    : format(end, 'd MMM yyyy, HH:mm', { locale: pl });
  return `${startText} – ${endText}`;
}

function formatPlace(event: PendingEvent) {
  if (event.location_type === 'nationwide') return 'Ogólnopolskie — wiele lokalizacji';
  const place = event.location
    ? [event.location.address, event.location.city, event.location.region].filter(Boolean).join(', ')
    : null;
  if (event.location_type === 'hybrid') return place ? `${place} + online` : 'Hybrydowe';
  return getRemoteLabel(event) ?? place;
}

function formatPrice(event: PendingEvent) {
  const info = event.ai_import;
  const amount = event.ticket_price != null ? `${event.ticket_price} ${info?.currency || 'PLN'}` : null;
  if (info?.missing_fields.includes('price') && !amount) return 'nie podano';
  if (event.event_type === 'free') return 'Bezpłatne';
  if (event.event_type === 'ask_organizer') return 'Cena: zapytaj Organizatora';
  if (event.event_type === 'unknown') return 'Brak informacji o cenie';
  if (event.event_type === 'voluntary') return amount ? `Dobrowolna ofiara (sugerowana ${amount})` : 'Dobrowolna ofiara';
  return amount ?? 'Płatne — kwota nieznana';
}

function DetailRow({ icon: Icon, label, children }: { icon: typeof Calendar; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
      <div>
        <span className="text-gray-600">{label}: </span>
        <span className="text-gray-900">{children}</span>
      </div>
    </div>
  );
}

export function AIDraftsPanel({ stats, initialEventId }: { stats?: PendingEventStats; initialEventId?: number | null }) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(initialEventId ?? null);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const { data: drafts = [], isLoading } = useQuery({
    queryKey: ['ai-drafts'],
    queryFn: () => adminApi.getAIDrafts(),
  });

  const selected = useMemo(() => drafts.find((draft) => draft.id === selectedId) ?? null, [drafts, selectedId]);
  // Liczymy tylko zaznaczenia, które wciąż są na liście (zatwierdzone/odrzucone znikają)
  const checkedIds = drafts.filter((draft) => checked.has(draft.id)).map((draft) => draft.id);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['ai-drafts'] });
    queryClient.invalidateQueries({ queryKey: ['pending-events'] });
    queryClient.invalidateQueries({ queryKey: ['pending-event-stats'] });
  };

  const approveMutation = useMutation({
    mutationFn: (id: number) => adminApi.approveEvent(id),
    onSuccess: () => {
      toast.success('Opublikowano. Link dla organizatora znajdziesz w zakładce „Organizatorzy”.');
      setSelectedId(null);
      refresh();
      queryClient.invalidateQueries({ queryKey: ['organizer-contacts'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Nie udało się opublikować wydarzenia')),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => adminApi.rejectEvent(id, reason),
    onSuccess: () => {
      toast.success('Szkic został odrzucony');
      setSelectedId(null);
      setShowRejectModal(false);
      setRejectReason('');
      refresh();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Nie udało się odrzucić szkicu')),
  });

  const bulkMutation = useMutation({
    mutationFn: (ids: number[]) => adminApi.bulkApproveEvents(ids),
    onSuccess: (result) => {
      if (result.failed.length) {
        toast.error(`${result.message}. ${result.failed.map((item) => `#${item.id}: ${item.error}`).join('; ')}`);
      } else {
        toast.success(result.message);
      }
      setChecked(new Set());
      refresh();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Nie udało się zatwierdzić zaznaczonych')),
  });

  const toggle = (id: number) => {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectComplete = () =>
    setChecked(new Set(drafts.filter((draft) => draft.ai_import?.data_status === 'complete').map((draft) => draft.id)));

  const info = selected?.ai_import;

  return (
    <>
      {/* Liczniki */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="flex items-center gap-2 font-medium text-gray-900">
          <Bot className="h-5 w-5 text-violet-600" />
          Wydarzenia znalezione przez AI
        </span>
        <span><strong className="text-violet-700">{stats?.ai_draft ?? 0}</strong> oczekuje</span>
        <span><strong className="text-amber-600">{stats?.ai_requires_review ?? 0}</strong> wymaga sprawdzenia</span>
        <span><strong className="text-red-600">{stats?.ai_possible_duplicates ?? 0}</strong> możliwe duplikaty</span>
        <div className="flex gap-2 ml-auto">
          <button
            onClick={selectComplete}
            className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-1"
          >
            <CheckSquare className="h-4 w-4" />
            Zaznacz kompletne
          </button>
          <button
            onClick={() => bulkMutation.mutate(checkedIds)}
            disabled={checkedIds.length === 0 || bulkMutation.isPending}
            className="px-3 py-1.5 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
          >
            <CheckCircle className="h-4 w-4" />
            Zatwierdź zaznaczone ({checkedIds.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              </div>
            ) : drafts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Brak szkiców AI czekających na akceptację</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {drafts.map((draft) => (
                  <div
                    key={draft.id}
                    onClick={() => setSelectedId(draft.id)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors flex items-start gap-3 ${
                      selectedId === draft.id ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked.has(draft.id)}
                      onChange={() => toggle(draft.id)}
                      onClick={(event) => event.stopPropagation()}
                      className="mt-1 h-4 w-4"
                      aria-label={`Zaznacz: ${draft.title}`}
                    />
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                      {draft.image_url ? (
                        <Image src={draft.image_url} alt={draft.title} width={64} height={64} className="object-cover w-full h-full" />
                      ) : (
                        <ImageOff className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">{draft.title}</h3>
                        {draft.ai_import && <DataStatusBadge status={draft.ai_import.data_status} />}
                        {!draft.image_url && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">NO_POSTER</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{formatDate(draft)}</p>
                      <p className="text-sm text-gray-600 truncate">
                        {[formatPlace(draft), draft.organizer].filter(Boolean).join(' · ') || 'Brak miejsca i organizatora'}
                      </p>
                      {draft.ai_import?.source_name && (
                        <p className="text-xs text-gray-400 mt-1">Źródło: {draft.ai_import.source_name}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Szczegóły */}
        <div className="lg:col-span-1">
          {selected && info ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-4 space-y-4">
              {selected.image_url ? (
                <div className="w-full bg-gray-200 rounded-lg overflow-hidden">
                  <Image
                    src={selected.image_url}
                    alt={selected.title}
                    width={0}
                    height={0}
                    sizes="100vw"
                    style={{ height: 'auto' }}
                    className="object-cover w-full h-full"
                  />
                </div>
              ) : (
                <div className="w-full rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
                  <ImageOff className="h-6 w-6 mx-auto mb-1 text-gray-400" />
                  Brak plakatu (NO_POSTER)
                </div>
              )}

              <div>
                <DataStatusBadge status={info.data_status} />
                <h3 className="font-bold text-lg text-gray-900 mt-2">{selected.title}</h3>
              </div>

              <div className="space-y-2">
                <DetailRow icon={Calendar} label="Data">{formatDate(selected)}</DetailRow>
                <DetailRow icon={MapPin} label="Miejsce">
                  {formatPlace(selected) ?? 'nie podano'}
                  {selected.online_event && selected.online_link && (
                    <a href={selected.online_link} target="_blank" rel="noopener noreferrer" className="ml-1 text-indigo-600 hover:underline">
                      (link)
                    </a>
                  )}
                </DetailRow>
                <DetailRow icon={User} label="Organizator">
                  {selected.organizer ?? 'nie podano'}
                  {selected.organizer_website && (
                    <a href={selected.organizer_website} target="_blank" rel="noopener noreferrer" className="ml-1 text-indigo-600 hover:underline">
                      (strona)
                    </a>
                  )}
                </DetailRow>
                <DetailRow icon={Wallet} label="Cena">{formatPrice(selected)}</DetailRow>
                <DetailRow icon={Tag} label="Kategorie">
                  {selected.categories.length ? selected.categories.map((category) => category.name).join(', ') : 'brak'}
                </DetailRow>
                {selected.ticket_url && (
                  <DetailRow icon={ExternalLink} label="Zapisy / bilety">
                    <a href={selected.ticket_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline break-all">
                      {selected.ticket_url}
                    </a>
                  </DetailRow>
                )}
              </div>

              <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm space-y-1">
                <p><span className="text-gray-600">Źródło:</span> <strong>{info.source_name || 'nie podano'}</strong></p>
                <p className="text-gray-600 break-all">{info.source_url}</p>
                <p>
                  <span className="text-gray-600">Sprawdzono:</span>{' '}
                  {format(new Date(info.source_checked_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
                </p>
                <a
                  href={info.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 w-full bg-indigo-600 text-white py-2 px-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Otwórz źródło
                </a>
              </div>

              <div className="rounded-lg border border-gray-200 p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Kontakt do organizatora</p>
                    {info.organizer && info.organizer_match && (
                      <p className="text-xs text-gray-500">{ORGANIZER_MATCH_LABELS[info.organizer_match]}</p>
                    )}
                  </div>
                  {info.organizer && <OrganizerStatusSelect contact={info.organizer} />}
                </div>
                {info.organizer ? (
                  <OrganizerContactDetails contact={info.organizer} />
                ) : (
                  <p className="text-sm text-gray-500">Organizator nieznany — AI nie podało nazwy.</p>
                )}
              </div>

              {info.ai_notes && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Uwagi AI</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{info.ai_notes}</p>
                </div>
              )}

              {(info.missing_fields.length > 0 || info.conflicts.length > 0 || info.requires_review) && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 space-y-1">
                  <p className="font-medium flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    Do sprawdzenia
                  </p>
                  {info.missing_fields.length > 0 && (
                    <p>Brakuje: {info.missing_fields.map((field) => MISSING_LABELS[field] ?? field).join(', ')}</p>
                  )}
                  {info.conflicts.map((conflict) => (
                    <p key={conflict}>Sprzeczność: {conflict}</p>
                  ))}
                  {info.requires_review && <p>AI prosi o ręczną weryfikację.</p>}
                </div>
              )}

              {info.duplicate_matches.length > 0 && (
                <div className={`rounded-lg border p-3 text-sm ${info.possible_duplicate ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                  <p className="font-medium text-gray-900 mb-1">
                    {info.possible_duplicate ? 'Możliwy duplikat — do weryfikacji' : 'Podobne wydarzenia'}
                  </p>
                  <ul className="space-y-1">
                    {info.duplicate_matches.map((match) => (
                      <li key={match.event_id}>
                        <a
                          href={match.url ?? `/moje-wydarzenia/${match.event_id}/edytuj`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline"
                        >
                          #{match.event_id} {match.title}
                        </a>{' '}
                        <span className="text-gray-500">
                          ({format(new Date(match.start_date), 'd MMM yyyy', { locale: pl })}, {match.status},{' '}
                          {Math.round(match.similarity * 100)}%)
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selected.description && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Opis</p>
                  <div
                    className="text-sm text-gray-700 prose prose-sm max-h-40 overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: selected.description }}
                  />
                </div>
              )}

              <p className="text-xs text-gray-400">
                Dodał: InicjatywaKatolicka.pl / AI Import{info.token_name ? ` (${info.token_name})` : ''},{' '}
                {format(new Date(info.created_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
              </p>

              <div className="space-y-2">
                <button
                  onClick={() => approveMutation.mutate(selected.id)}
                  disabled={approveMutation.isPending}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle className="h-5 w-5" />
                  Zatwierdź i opublikuj
                </button>
                <div className="flex gap-2">
                  <Link
                    href={`/moje-wydarzenia/${selected.id}/edytuj`}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <Pencil className="h-4 w-4" />
                    Edytuj
                  </Link>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={rejectMutation.isPending}
                    className="flex-1 bg-red-600 text-white py-2 px-3 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Odrzuć
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
              <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Wybierz szkic, aby zobaczyć szczegóły i źródło</p>
            </div>
          )}
        </div>
      </div>

      {showRejectModal && selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Odrzuć szkic AI</h3>
            <p className="text-sm text-gray-600 mb-4">
              Powód odrzucenia &quot;{selected.title}&quot; (opcjonalnie — AI zobaczy go w statusie swojego szkicu):
            </p>
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              rows={4}
              placeholder="np. wydarzenie odwołane, nie jest katolickie, duplikat #123..."
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={() => rejectMutation.mutate({ id: selected.id, reason: rejectReason })}
                disabled={rejectMutation.isPending}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                Odrzuć szkic
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
