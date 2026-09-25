'use client';

import { FormEvent, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bookmark, ChevronLeft, ChevronRight, Copy, KeyRound, Save, Send, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { PressAttachment, PressMaterial, PressPage, pressError, pressKinds, pressLocalDate, pressMedia, pressWorkflow, splitPressValues } from '@/lib/api/press';

export function QueryFailure({ error, retry }: { error: unknown; retry: () => void }) {
  return <div><p role="alert" className="press-error">{pressError(error)}</p><button onClick={retry}>Spróbuj ponownie</button></div>;
}

interface DashboardData {
  materials: number; downloads: number; saved: number; partners?: number; pending_access?: number; pending_materials?: number; interested?: number;
  formats: { attachment__material__kind: string; count: number }[];
  recent_downloads: { id: number; attachment__original_name: string; attachment__material__title: string; created_at: string }[];
}

export function Dashboard({ userId, admin = false }: { userId: number; admin?: boolean }) {
  const query = useQuery({ queryKey: ['press', userId, 'dashboard'], queryFn: async () => (await apiClient.get<DashboardData>('/press/dashboard/')).data, retry: false, gcTime: 0 });
  if (query.isPending) return <p role="status">Ładowanie pulpitu…</p>;
  if (query.isError) return <QueryFailure error={query.error} retry={() => void query.refetch()} />;
  const data = query.data;
  const metrics = admin ? [['Materiały', data.materials], ['Partnerzy', data.partners], ['Do weryfikacji', data.pending_materials], ['Nowe wnioski', data.pending_access], ['Pobrania', data.downloads], ['Zainteresowania', data.interested]] : [['Dostępne materiały', data.materials], ['Moje pobrania', data.downloads], ['Zapisane', data.saved]];
  return <section><h2>{admin ? 'Pulpit redakcyjny' : 'Pulpit partnera'}</h2><div className="press-metrics">{metrics.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value ?? 0}</strong></div>)}</div>
    <div className="press-dashboard-grid"><section><h3>Pobrania według formatu</h3>{data.formats.length === 0 && <p className="press-muted">Brak pobrań.</p>}{data.formats.map(row => <div className="press-bar" key={row.attachment__material__kind}><span>{pressKinds[row.attachment__material__kind]}<b>{row.count}</b></span><meter min={0} max={Math.max(data.downloads, 1)} value={row.count} /></div>)}</section>
      <section><h3>{admin ? 'Ostatnie pobrania' : 'Moja ostatnia aktywność'}</h3>{data.recent_downloads.length === 0 && <p className="press-muted">Brak aktywności.</p>}{data.recent_downloads.map(item => <div className="press-activity" key={item.id}><strong>{item.attachment__material__title}</strong><span>{item.attachment__original_name}</span><time>{new Date(item.created_at).toLocaleString('pl-PL')}</time></div>)}</section></div>
  </section>;
}

type Preferences = { regions: string[]; topics: string[]; formats: string[]; email_frequency: string; urgent_only: boolean };

export function PreferencesPanel({ userId }: { userId: number }) {
  const query = useQuery({ queryKey: ['press', userId, 'preferences'], queryFn: async () => (await apiClient.get<Preferences>('/press/preferences/')).data, retry: false, gcTime: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setError(''); setMessage('');
    try { await apiClient.put('/press/preferences/', { regions: splitPressValues(form.get('regions')), topics: splitPressValues(form.get('topics')), formats: form.getAll('formats'), email_frequency: form.get('email_frequency'), urgent_only: form.get('urgent_only') === 'on' }); setMessage('Zainteresowania zapisane.'); }
    catch (failure) { setError(pressError(failure)); } finally { setBusy(false); }
  }
  if (query.isPending) return <p role="status">Ładowanie zainteresowań…</p>;
  if (query.isError) return <QueryFailure error={query.error} retry={() => void query.refetch()} />;
  return <form className="press-form" onSubmit={save}><h2>Moje zainteresowania</h2>{error && <p role="alert" className="press-error">{error}</p>}{message && <p role="status" className="press-success">{message}</p>}
    <label>Regiony (oddzielone przecinkami)<input name="regions" defaultValue={query.data.regions.join(', ')} /></label>
    <label>Tematy (oddzielone przecinkami)<input name="topics" defaultValue={query.data.topics.join(', ')} /></label>
    <fieldset><legend>Formaty</legend><div className="press-checks">{Object.entries(pressKinds).map(([key, label]) => <label className="press-checkbox" key={key}><input type="checkbox" name="formats" value={key} defaultChecked={query.data.formats.includes(key)} />{label}</label>)}</div></fieldset>
    <label>Powiadomienia e-mail<select name="email_frequency" defaultValue={query.data.email_frequency ?? 'off'}><option value="off">Wyłączone</option><option value="immediate">Na bieżąco</option><option value="daily">Raz dziennie</option><option value="weekly">Raz w tygodniu</option></select></label>
    <label className="press-checkbox"><input type="checkbox" name="urgent_only" defaultChecked={query.data.urgent_only} />E-maile tylko o pilnych materiałach</label>
    <button className="press-primary" disabled={busy}><Save size={18} />Zapisz zainteresowania</button>
  </form>;
}

type BookmarkState = { saved: boolean; note: string; interested: boolean };

export function BookmarkPanel({ materialId, userId }: { materialId: number; userId: number }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['press', userId, 'bookmark', materialId], queryFn: async () => (await apiClient.get<BookmarkState>(`/press/materials/${materialId}/bookmark/`)).data, retry: false, gcTime: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setError('');
    try { await apiClient.put(`/press/materials/${materialId}/bookmark/`, { note: form.get('note'), interested: form.get('interested') === 'on' }); setMessage('Zapisano.'); void queryClient.invalidateQueries({ queryKey: ['press', userId] }); }
    catch (failure) { setError(pressError(failure)); } finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setError('');
    try { await apiClient.delete(`/press/materials/${materialId}/bookmark/`); setMessage('Usunięto z zapisanych.'); void queryClient.invalidateQueries({ queryKey: ['press', userId] }); }
    catch (failure) { setError(pressError(failure)); } finally { setBusy(false); }
  }
  if (query.isPending) return <p role="status">Ładowanie notatki…</p>;
  if (query.isError) return <QueryFailure error={query.error} retry={() => void query.refetch()} />;
  return <section className="press-section"><h3>{query.data.saved ? 'Zapisany materiał' : 'Zapisz materiał'}</h3>{error && <p role="alert" className="press-error">{error}</p>}{message && <p role="status">{message}</p>}
    <form key={String(query.data.saved)} className="press-form" onSubmit={save}><label>Moja prywatna notatka<textarea name="note" rows={3} maxLength={3000} defaultValue={query.data.note} /></label><label className="press-checkbox"><input type="checkbox" name="interested" defaultChecked={query.data.interested} />Zgłoś redakcji IK zainteresowanie tematem</label><div className="press-actions"><button disabled={busy}><Bookmark size={18} />Zapisz</button>{query.data.saved && <button type="button" disabled={busy} onClick={() => void remove()}><Trash2 size={18} />Usuń z zapisanych</button>}</div></form>
  </section>;
}

type ReviewEntry = { id: number; actor: string; status: string; previous_status: string; note: string; created_at: string };
const transitions: Record<string, string[]> = { draft: ['review'], review: ['approved', 'rejected'], approved: ['published', 'draft'], published: ['archived', 'draft'], archived: ['draft'], rejected: ['draft', 'review'] };

export function WorkflowPanel({ material, userId, admin, refresh }: { material: PressMaterial; userId: number; admin: boolean; refresh: () => void }) {
  const query = useQuery({ queryKey: ['press', userId, 'workflow', material.id], queryFn: async () => (await apiClient.get<ReviewEntry[]>(`/press/materials/${material.id}/workflow/`)).data, retry: false, gcTime: 0 });
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function change(status: string) { setBusy(true); setError(''); try { await apiClient.post(`/press/materials/${material.id}/workflow/`, { status, note }); setNote(''); refresh(); } catch (failure) { setError(pressError(failure)); } finally { setBusy(false); } }
  return <section className="press-section"><h3>Obieg redakcyjny: {pressWorkflow[material.workflow]}</h3>{error && <p role="alert" className="press-error">{error}</p>}<label>Uzasadnienie / uwagi<textarea value={note} onChange={event => setNote(event.target.value)} maxLength={3000} rows={2} /></label><div className="press-actions press-workflow-actions">{(transitions[material.workflow] ?? []).filter(status => admin || status === 'review').map(status => <button disabled={busy || (status === 'rejected' && !note.trim())} key={status} onClick={() => void change(status)}><Send size={16} />{status === 'review' ? 'Przekaż do weryfikacji' : pressWorkflow[status]}</button>)}</div>
    <details><summary>Historia decyzji i zmian</summary>{query.isError && <QueryFailure error={query.error} retry={() => void query.refetch()} />}{query.data?.map(entry => <div className="press-activity" key={entry.id}><strong>{pressWorkflow[entry.status]} · {entry.actor}</strong><span>{entry.note}</span><time>{new Date(entry.created_at).toLocaleString('pl-PL')}</time></div>)}</details>
  </section>;
}

export function RightsFields({ rights }: { rights?: Partial<PressAttachment> }) {
  return <><div className="press-fields"><label>Właściciel praw<input name="rights_owner" maxLength={200} defaultValue={rights?.rights_owner} /></label><label>Źródło<input name="source" maxLength={300} defaultValue={rights?.source} /></label><label>Wygaśnięcie licencji<input name="license_expires_at" type="datetime-local" defaultValue={pressLocalDate(rights?.license_expires_at)} /></label></div><fieldset><legend>Dozwolone media</legend><div className="press-checks">{Object.entries(pressMedia).map(([key, label]) => <label className="press-checkbox" key={key}><input type="checkbox" name="allowed_media" value={key} defaultChecked={rights?.allowed_media?.includes(key)} />{label}</label>)}</div></fieldset></>;
}

export function AttachmentRights({ attachment, refresh }: { attachment: PressAttachment; refresh: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setError(''); setMessage('');
    const values = Object.fromEntries(form.entries());
    try { await apiClient.patch(`/press/attachments/${attachment.id}/rights/`, { ...values, allowed_media: form.getAll('allowed_media'), license_expires_at: values.license_expires_at ? new Date(String(values.license_expires_at)).toISOString() : null }); setMessage('Prawa pliku zapisane.'); refresh(); }
    catch (failure) { setError(pressError(failure)); } finally { setBusy(false); }
  }
  return <details className="press-file-rights"><summary>Prawa pliku: {attachment.original_name}</summary><form className="press-form" onSubmit={save}>{error && <p role="alert" className="press-error">{error}</p>}{message && <p role="status">{message}</p>}<RightsFields rights={attachment} /><label>Autor<input name="author" maxLength={200} defaultValue={attachment.author} /></label><label>Wymagany podpis<input name="credit" maxLength={300} defaultValue={attachment.credit} /></label><label>Licencja pliku<textarea name="license" rows={3} maxLength={3000} defaultValue={attachment.license} /></label><button disabled={busy}><Save size={16} />Zapisz prawa pliku</button></form></details>;
}

interface Interest { id: number; material: string; newsroom: string; email: string; updated_at: string }

export function InterestsPanel({ userId }: { userId: number }) {
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ['press', userId, 'interests', page], queryFn: async () => (await apiClient.get<PressPage<Interest>>('/press/admin/interests/', { params: { page } })).data, retry: false, gcTime: 0 });
  if (query.isPending) return <p role="status">Ładowanie zainteresowań redakcji…</p>;
  if (query.isError) return <QueryFailure error={query.error} retry={() => void query.refetch()} />;
  return <section><h2>Zainteresowanie tematami</h2>{query.data.count === 0 && <p>Brak zgłoszeń zainteresowania.</p>}{query.data.results.map(item => <article className="press-review" key={item.id}><h3>{item.material}</h3><p>{item.newsroom}</p><a href={`mailto:${item.email}`}>{item.email}</a><p className="press-muted">{new Date(item.updated_at).toLocaleString('pl-PL')}</p></article>)}<nav className="press-pagination"><button aria-label="Poprzednia strona" disabled={!query.data.previous} onClick={() => setPage(page - 1)}><ChevronLeft size={18} /></button><span>{page}</span><button aria-label="Następna strona" disabled={!query.data.next} onClick={() => setPage(page + 1)}><ChevronRight size={18} /></button></nav></section>;
}

export function IntegrationsPanel({ userId }: { userId: number }) {
  const query = useQuery({ queryKey: ['press', userId, 'key'], queryFn: async () => (await apiClient.get<{ enabled: boolean; has_key: boolean; last_used_at: string | null; requests: number }>('/press/key/')).data, retry: false, gcTime: 0 });
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function generate() { setBusy(true); setError(''); setMessage(''); try { const { data } = await apiClient.post<{ key: string }>('/press/key/'); setToken(data.key); void query.refetch(); } catch (failure) { setError(pressError(failure)); } finally { setBusy(false); } }
  async function revoke() { setBusy(true); setError(''); try { await apiClient.delete('/press/key/'); setToken(''); setMessage('Klucz unieważniony.'); void query.refetch(); } catch (failure) { setError(pressError(failure)); } finally { setBusy(false); } }
  if (query.isPending) return <p role="status">Ładowanie dostępu technicznego…</p>;
  if (query.isError) return <QueryFailure error={query.error} retry={() => void query.refetch()} />;
  return <section><h2>API i RSS</h2>{error && <p role="alert" className="press-error">{error}</p>}{message && <p role="status">{message}</p>}<p>Status: {query.data.enabled ? 'Dostęp techniczny aktywny' : 'Dostęp techniczny nieprzyznany'}</p><p>Zapytania: {query.data.requests}</p><p>Ostatnie użycie: {query.data.last_used_at ? new Date(query.data.last_used_at).toLocaleString('pl-PL') : 'Brak'}</p>
    {token && <div className="press-key"><label>Nowy klucz API<input type="password" readOnly value={token} autoComplete="off" /></label><button title="Kopiuj klucz API" aria-label="Kopiuj klucz API" onClick={async () => { try { await navigator.clipboard.writeText(token); setMessage('Klucz skopiowany.'); } catch { setError('Nie udało się skopiować klucza.'); } }}><Copy size={18} /></button></div>}
    <div className="press-actions"><button disabled={busy || !query.data.enabled} onClick={() => void generate()}><KeyRound size={18} />{query.data.has_key ? 'Zastąp klucz nowym' : 'Wygeneruj klucz'}</button>{query.data.has_key && <button disabled={busy} onClick={() => void revoke()}><Trash2 size={18} />Unieważnij klucz</button>}</div>
  </section>;
}