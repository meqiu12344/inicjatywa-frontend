'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Bell, Check, FileText, LayoutDashboard, Users, X } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import {
  pressError,
  pressExtendedFeaturesEnabled,
  pressStatuses,
  PressAccess,
  PressDecision,
  PressDownload,
  PressPage,
} from '@/lib/api/press';
import { Library } from './MaterialLibrary';
import { Feedback, Pages } from './PressFeedback';
import { Dashboard, InterestsPanel } from './WorkspacePanels';

function Review({ access, onDecision }: { access: PressAccess; onDecision: (message: string) => void }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function decide(status: string) {
    setBusy(true);
    setError('');
    try {
      const { data } = await apiClient.post<PressDecision>(`/press/admin/access/${access.id}/decision/`, {
        status,
        decision_note: note,
      });
      onDecision(
        data.notification_sent
          ? 'Decyzja zapisana, e-mail wysłany.'
          : 'Decyzja zapisana. Nie udało się wysłać e-maila.',
      );
    } catch (failure) {
      setError(pressError(failure));
    } finally {
      setBusy(false);
    }
  }
  async function technical(enabled: boolean) {
    setBusy(true);
    setError('');
    try {
      await apiClient.post(`/press/admin/access/${access.id}/technical/`, { enabled });
      onDecision(enabled ? 'Przyznano dostęp techniczny.' : 'Cofnięto dostęp techniczny i unieważniono klucz.');
    } catch (failure) {
      setError(pressError(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="press-review">
      <div className="press-row">
        <h3>{access.full_name}</h3>
        <span className="press-tag">{pressStatuses[access.status]}</span>
      </div>
      <p>
        {access.newsroom} · {access.email} · ID konta: {access.user_id}
      </p>
      <p className="press-body">{access.motivation}</p>
      <div className="press-actions">
        <a href={access.portfolio} target="_blank" rel="noopener noreferrer">
          Publikacje autora
        </a>
        {access.website && (
          <a href={access.website} target="_blank" rel="noopener noreferrer">
            Strona redakcji
          </a>
        )}
      </div>
      {access.decision_note && <p>Ostatnia decyzja: {access.decision_note}</p>}
      {pressExtendedFeaturesEnabled && access.status === 'approved' && (
        <label className="press-checkbox press-technical">
          <input
            type="checkbox"
            checked={access.api_enabled ?? false}
            disabled={busy}
            onChange={event => void technical(event.target.checked)}
          />
          Dostęp techniczny API / RSS
        </label>
      )}
      <Feedback error={error} />
      {access.status !== 'rejected' && (
        <>
          <label>
            Uzasadnienie decyzji
            <textarea rows={2} maxLength={3000} value={note} onChange={event => setNote(event.target.value)} />
          </label>
          <div className="press-actions">
            {(access.status === 'pending' || access.status === 'suspended') && (
              <button className="press-primary" disabled={busy} onClick={() => void decide('approved')}>
                <Check size={18} />
                {access.status === 'suspended' ? 'Przywróć dostęp' : 'Zatwierdź'}
              </button>
            )}
            {access.status === 'pending' && (
              <button disabled={busy || !note.trim()} onClick={() => void decide('rejected')}>
                <X size={18} />
                Odrzuć
              </button>
            )}
            {access.status === 'approved' && (
              <button disabled={busy || !note.trim()} onClick={() => void decide('suspended')}>
                <X size={18} />
                Zawieś dostęp
              </button>
            )}
          </div>
        </>
      )}
    </article>
  );
}

export function Administration({ userId }: { userId: number }) {
  const [tab, setTab] = useState('dashboard');
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('pending');
  const requests = useQuery({
    queryKey: ['press', userId, 'requests', page, filter],
    queryFn: async () =>
      (await apiClient.get<PressPage<PressAccess>>('/press/admin/access/', { params: { page, status: filter } })).data,
    enabled: tab === 'access',
    retry: false,
    gcTime: 0,
  });
  const downloads = useQuery({
    queryKey: ['press', userId, 'downloads', page],
    queryFn: async () =>
      (await apiClient.get<PressPage<PressDownload>>('/press/admin/downloads/', { params: { page } })).data,
    enabled: tab === 'downloads',
    retry: false,
    gcTime: 0,
  });
  return (
    <div className="press-workspace">
      <nav className="press-sidebar" aria-label="Zarządzanie prasą">
        {[
          { key: 'dashboard', label: 'Pulpit', icon: LayoutDashboard },
          { key: 'access', label: 'Partnerzy', icon: Users },
          { key: 'materials', label: 'Materiały', icon: FileText },
          { key: 'interests', label: 'Zainteresowanie tematami', icon: Bell },
          { key: 'downloads', label: 'Historia pobrań', icon: BarChart3 },
        ].map(({ key, label, icon: Icon }) => (
          <button
            aria-current={tab === key ? 'page' : undefined}
            key={key}
            onClick={() => {
              setTab(key);
              setPage(1);
            }}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>
      <div className="press-workspace-content">
        {tab === 'dashboard' && <Dashboard userId={userId} admin />}
        {tab === 'interests' && <InterestsPanel userId={userId} />}
        {tab === 'materials' && <Library admin userId={userId} />}
        {tab === 'access' && (
          <>
            <Feedback message={message} />
            <label className="press-filter">
              Status
              <select
                value={filter}
                onChange={event => {
                  setFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Wszystkie</option>
                {Object.entries(pressStatuses).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {requests.isPending && <p role="status">Ładowanie wniosków…</p>}
            {requests.isError ? (
              <>
                <Feedback error={pressError(requests.error)} />
                <button onClick={() => void requests.refetch()}>Spróbuj ponownie</button>
              </>
            ) : (
              <>
                {requests.data?.results.map(access => (
                  <Review
                    key={access.id}
                    access={access}
                    onDecision={message => {
                      setMessage(message);
                      void requests.refetch();
                    }}
                  />
                ))}
                {requests.data?.count === 0 && <p className="press-empty">Brak wniosków w tym statusie.</p>}
                <Pages data={requests.data} page={page} setPage={setPage} />
              </>
            )}
          </>
        )}
        {tab === 'downloads' && (
          <>
            {downloads.isPending && <p role="status">Ładowanie historii…</p>}
            {downloads.isError ? (
              <>
                <Feedback error={pressError(downloads.error)} />
                <button onClick={() => void downloads.refetch()}>Spróbuj ponownie</button>
              </>
            ) : (
              <>
                <div className="press-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Konto</th>
                        <th>Materiał</th>
                        <th>Plik</th>
                        <th>Rodzaj</th>
                      </tr>
                    </thead>
                    <tbody>
                      {downloads.data?.results.map(entry => (
                        <tr key={entry.id}>
                          <td>{new Date(entry.created_at).toLocaleString('pl-PL')}</td>
                          <td>{entry.email || 'Usunięte konto'}</td>
                          <td>{entry.material}</td>
                          <td>{entry.filename}</td>
                          <td>{entry.action === 'preview' ? 'Podgląd' : 'Pobranie'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {downloads.data?.count === 0 && <p className="press-empty">Brak pobrań.</p>}
                <Pages data={downloads.data} page={page} setPage={setPage} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
