'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { DoorOpen, Plus, ScanLine, Copy, Check, ShieldAlert } from 'lucide-react';
import { useAuthStore, useHydration } from '@/stores/authStore';
import { apiClient, getErrorMessage } from '@/lib/api/client';

interface Props {
  params: Promise<{ eventId: string }>;
}

interface GateDevice {
  id: number;
  name: string;
  is_active: boolean;
  last_seen_at: string | null;
  created_at: string;
}

interface GateListResponse {
  devices: GateDevice[];
}

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

export default function OrganizerGatesPage({ params }: Props) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.eventId;
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const hydrated = useHydration();
  const queryClient = useQueryClient();

  const [newName, setNewName] = useState('');
  const [issuedToken, setIssuedToken] = useState<{ name: string; token: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.push('/logowanie?redirect=/moje-wydarzenia');
    }
  }, [hydrated, isAuthenticated, router]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['gate-devices', eventId],
    queryFn: async () => {
      const res = await apiClient.get(`/tickets/organizer/event/${eventId}/gates/`);
      return res.data as GateListResponse;
    },
    enabled: isAuthenticated && !!eventId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/tickets/organizer/event/${eventId}/gates/`, {
        name: newName.trim(),
      });
      return res.data as { id: number; name: string; token: string };
    },
    onSuccess: (created) => {
      setIssuedToken({ name: created.name, token: created.token });
      setNewName('');
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ['gate-devices', eventId] });
    },
    onError: (error) => {
      setFormError(getErrorMessage(error, 'Nie udało się utworzyć bramki.'));
    },
  });

  const handleCopy = async () => {
    if (!issuedToken) return;
    try {
      await navigator.clipboard.writeText(issuedToken.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard niedostępny */
    }
  };

  if (!hydrated) return null;

  const devices = data?.devices ?? [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <DoorOpen className="w-7 h-7 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Bramki skanujące</h1>
        </div>
        <Link
          href={`/bilety/skaner/${eventId}`}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          <ScanLine className="w-4 h-4" />
          Otwórz skaner
        </Link>
      </div>

      <p className="text-sm text-gray-600 mb-6">
        Każda bramka ma własny token, którym uwierzytelnia się skaner. Token umożliwia skanowanie
        biletów tego wydarzenia (również offline) bez logowania na konto organizatora.
      </p>

      {/* Issued token banner (shown once) */}
      {issuedToken && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-2 mb-2">
            <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Token bramki „{issuedToken.name}”</p>
              <p className="text-sm text-amber-800">
                Zapisz teraz — nie będzie ponownie widoczny. Wklej go w skanerze (ustawienia bramki).
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <code className="flex-1 bg-white border border-amber-200 rounded-lg px-3 py-2 text-sm break-all">
              {issuedToken.token}
            </code>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-3 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Skopiowano' : 'Kopiuj'}
            </button>
          </div>
          <button
            onClick={() => setIssuedToken(null)}
            className="mt-2 text-xs text-amber-700 hover:text-amber-900"
          >
            Zapisałem token — ukryj
          </button>
        </div>
      )}

      {/* Create form */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Nazwa nowej bramki</label>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && newName.trim() && createMutation.mutate()}
            placeholder="np. Brama A / Wejście główne"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={() => createMutation.mutate()}
            disabled={!newName.trim() || createMutation.isPending}
            className="flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {createMutation.isPending ? 'Tworzenie...' : 'Utwórz bramkę'}
          </button>
        </div>
        {formError && <p className="mt-2 text-sm text-red-600">{formError}</p>}
      </div>

      {/* Device list */}
      {isLoading ? (
        <p className="text-gray-500">Ładowanie bramek...</p>
      ) : isError ? (
        <p className="text-red-600">Nie udało się pobrać listy bramek.</p>
      ) : devices.length === 0 ? (
        <p className="text-gray-500">Brak bramek. Utwórz pierwszą powyżej.</p>
      ) : (
        <ul className="space-y-2">
          {devices.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3"
            >
              <div>
                <p className="font-medium text-gray-900">{d.name}</p>
                <p className="text-xs text-gray-500">
                  Ostatnia aktywność: {formatDate(d.last_seen_at)} · utworzono {formatDate(d.created_at)}
                </p>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  d.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {d.is_active ? 'Aktywna' : 'Nieaktywna'}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8">
        <Link
          href={`/bilety/organizator/zarzadzaj/${eventId}`}
          className="text-indigo-600 hover:text-indigo-700 text-sm"
        >
          ← Wróć do zarządzania biletami
        </Link>
      </div>
    </div>
  );
}
