'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, BarChart3, Bell, Bookmark, Check, ChevronLeft, ChevronRight, Download, FileText, KeyRound, LayoutDashboard, Plus, Save, Search, Settings2, ShieldCheck, Upload, Users, X } from 'lucide-react';
import { useAuthStore, useHydration } from '@/stores/authStore';
import { apiClient } from '@/lib/api/client';
import { downloadPressFile, downloadPressResource, pressError, pressKinds, pressStatuses, pressWorkflow, pressMedia, pressLocalDate, splitPressValues, PressAccess, PressDownload, PressMaterial, PressPage } from '@/lib/api/press';
import { AttachmentRights, BookmarkPanel, Dashboard, IntegrationsPanel, InterestsPanel, PreferencesPanel, RightsFields, WorkflowPanel } from './WorkspacePanels';
import './press.css';

type AccessState = { is_staff: boolean; can_submit: boolean; access: PressAccess | null };
type Decision = { notification_sent: boolean };
const inputValues = (form: HTMLFormElement) => Object.fromEntries(new FormData(form).entries());

function Feedback({ error, message }: { error?: string; message?: string }) {
  return <>{error && <p className="press-error" role="alert">{error}</p>}{message && <p className="press-success" role="status">{message}</p>}</>;
}

function Pages({ data, page, setPage }: { data?: PressPage<unknown>; page: number; setPage: (page: number) => void }) {
  if (!data || (!data.next && !data.previous)) return null;
  return <nav className="press-pagination" aria-label="Strony wyników">
    <button title="Poprzednia strona" aria-label="Poprzednia strona" disabled={!data.previous} onClick={() => setPage(page - 1)}><ChevronLeft size={18} /></button>
    <span>Strona {page} · {data.count} wyników</span>
    <button title="Następna strona" aria-label="Następna strona" disabled={!data.next} onClick={() => setPage(page + 1)}><ChevronRight size={18} /></button>
  </nav>;
}

function Application({ access, onDone }: { access: PressAccess | null; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = inputValues(event.currentTarget);
    setBusy(true); setError('');
    try {
      const { data } = await apiClient.post<Decision>('/press/access/', values);
      setMessage(data.notification_sent ? 'Wniosek wysłany.' : 'Wniosek zapisany, ale wiadomość e-mail nie została wysłana.');
      onDone();
    } catch (failure) { setError(pressError(failure)); }
    finally { setBusy(false); }
  }
  return <section className="press-section">
    {access && <div className="press-status"><ShieldCheck size={24} /><div><h2>{pressStatuses[access.status]}</h2><p>{access.newsroom}</p>{access.decision_note && <p>{access.decision_note}</p>}</div></div>}
    <Feedback error={error} message={message} />
    {(!access || access.status === 'rejected') && <form onSubmit={submit} className="press-form">
      <h2>Wniosek o dostęp dla mediów</h2>
      <div className="press-fields">
        <label>Imię i nazwisko<input name="full_name" required maxLength={200} defaultValue={access?.full_name} autoComplete="name" /></label>
        <label>Redakcja / medium<input name="newsroom" required maxLength={200} defaultValue={access?.newsroom} autoComplete="organization" /></label>
        <label>Strona redakcji<input name="website" type="url" defaultValue={access?.website} /></label>
        <label>Link do publikacji / profil autora<input name="portfolio" type="url" required defaultValue={access?.portfolio} /></label>
      </div>
      <label>Cel korzystania z materiałów<textarea name="motivation" required maxLength={3000} rows={4} defaultValue={access?.motivation} /></label>
      <button className="press-primary" disabled={busy}><Check size={18} />{busy ? 'Wysyłanie…' : 'Wyślij wniosek'}</button>
    </form>}
  </section>;
}

function MaterialEditor({ material, admin, onDone, onClose }: { material?: PressMaterial; admin: boolean; onDone: (id: number) => void; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form.entries());
    const payload = { ...values, event: values.event ? Number(values.event) : null,
      allowed_media: form.getAll('allowed_media'), tags: splitPressValues(form.get('tags')),
      selected_partners: splitPressValues(form.get('selected_partners')).map(Number), urgent: values.urgent === 'on',
      license_expires_at: values.license_expires_at ? new Date(String(values.license_expires_at)).toISOString() : null,
      embargo_until: values.embargo_until ? new Date(String(values.embargo_until)).toISOString() : null,
      available_from: values.available_from ? new Date(String(values.available_from)).toISOString() : new Date().toISOString() };
    setBusy(true); setError('');
    try {
      const response = material ? await apiClient.patch<PressMaterial>(`/press/materials/${material.id}/`, payload) : await apiClient.post<PressMaterial>('/press/materials/', payload);
      onDone(response.data.id); onClose();
    } catch (failure) { setError(pressError(failure)); }
    finally { setBusy(false); }
  }
  return <form className="press-form press-section" onSubmit={submit}>
    <div className="press-row"><h2>{material ? 'Edycja materiału' : 'Nowy materiał'}</h2><button type="button" onClick={onClose} title="Zamknij edycję" aria-label="Zamknij edycję"><X size={20} /></button></div>
    <Feedback error={error} />
    <label>Tytuł<input name="title" required maxLength={250} defaultValue={material?.title} /></label>
    <label>Treść / opis<textarea name="description" rows={8} required maxLength={20000} defaultValue={material?.description} /></label>
    <div className="press-fields">
      <label>Format<select name="kind" defaultValue={material?.kind ?? 'release'}>{Object.entries(pressKinds).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>ID powiązanego wydarzenia<input name="event" type="number" min={1} defaultValue={material?.event ?? ''} /></label>
      <label>Autor<input name="author" required maxLength={200} defaultValue={material?.author} /></label>
      <label>Wymagany podpis<input name="credit" required maxLength={300} defaultValue={material?.credit} /></label>
      <label>Kontakt prasowy<input name="contact_email" type="email" required defaultValue={material?.contact_email} /></label>
      <label>Dostępny od<input name="available_from" type="datetime-local" defaultValue={pressLocalDate(material?.available_from)} /></label>
      <label>Region<input name="region" maxLength={100} defaultValue={material?.region} /></label>
      <label>Miasto<input name="city" maxLength={100} defaultValue={material?.city} /></label>
      <label>Temat<input name="topic" maxLength={100} defaultValue={material?.topic} /></label>
      <label>Tagi (oddzielone przecinkami)<input name="tags" defaultValue={material?.tags?.join(', ')} /></label>
      <label>Osoba kontaktowa<input name="contact_name" maxLength={200} defaultValue={material?.contact_name} /></label>
      <label>Telefon dla mediów<input name="contact_phone" type="tel" maxLength={40} defaultValue={material?.contact_phone} /></label>
    </div>
    <label>Licencja i warunki wykorzystania<textarea name="license" rows={3} required maxLength={3000} defaultValue={material?.license} /></label>
    <RightsFields rights={material} />
    {admin && <div className="press-fields"><label>Dostęp<select name="audience" defaultValue={material?.audience ?? 'partners'}><option value="partners">Partnerzy</option><option value="selected">Wybrani partnerzy</option><option value="internal">Wewnętrzny</option></select></label><label>ID kont wybranych partnerów (przecinki)<input name="selected_partners" inputMode="numeric" pattern="[0-9, ]*" defaultValue={material?.selected_partners?.join(', ')} /></label></div>}
    <div className="press-fields"><label>Embargo do<input name="embargo_until" type="datetime-local" defaultValue={pressLocalDate(material?.embargo_until)} /></label><label>Tryb embarga<select name="embargo_mode" defaultValue={material?.embargo_mode ?? 'block'}><option value="block">Zablokuj pobieranie</option><option value="notice">Udostępnij z informacją o zakazie publikacji</option></select></label></div>
    <label className="press-checkbox"><input name="urgent" type="checkbox" defaultChecked={material?.urgent} />Pilny materiał</label>
    <details className="press-editor-details"><summary>Dla radia</summary><label>Informacja 20–30 sekund<textarea name="radio_short" rows={4} maxLength={3000} defaultValue={material?.radio_short} /></label><label>Informacja 60–90 sekund<textarea name="radio_long" rows={6} maxLength={8000} defaultValue={material?.radio_long} /></label></details>
    <details className="press-editor-details"><summary>Program / wywiad / transkrypcja</summary><label>Gość<input name="guest" maxLength={200} defaultValue={material?.guest} /></label><label>Adres filmu YouTube<input name="youtube_url" type="url" defaultValue={material?.youtube_url} /></label><label>Transkrypcja<textarea name="transcript" rows={8} maxLength={100000} defaultValue={material?.transcript} /></label></details>
    <button className="press-primary" disabled={busy}><Save size={18} />{busy ? 'Zapisywanie…' : 'Zapisz materiał'}</button>
  </form>;
}

function MaterialDetail({ material, admin, mine, userId, refresh, close, edit }: { material: PressMaterial; admin: boolean; mine: boolean; userId: number; refresh: () => void; close: () => void; edit: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const editable = admin || (mine && ['draft', 'rejected'].includes(material.workflow));
  const embargo = material.embargo_until && new Date(material.embargo_until) > new Date();
  const blocked = !admin && !!embargo && material.embargo_mode === 'block';
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true); setError('');
    try { await apiClient.post(`/press/materials/${material.id}/attachments/`, new FormData(form), { headers: { 'Content-Type': 'multipart/form-data' } }); form.reset(); refresh(); }
    catch (failure) { setError(pressError(failure)); }
    finally { setBusy(false); }
  }
  return <article className="press-section press-detail">
    <div className="press-row"><span className="press-tag">{pressKinds[material.kind]}</span><button onClick={close} title="Zamknij materiał" aria-label="Zamknij materiał"><X size={20} /></button></div>
    <h2>{material.title}</h2>
    {material.urgent && <p className="press-alert"><Bell size={16} />Pilny materiał</p>}
    {(material.region || material.city || material.topic) && <p className="press-muted">{[material.region, material.city, material.topic].filter(Boolean).join(' · ')}</p>}
    {material.event_title && <p>Wydarzenie: {material.event_title}</p>}
    {embargo && <p className="press-embargo">Embargo do {new Date(material.embargo_until!).toLocaleString('pl-PL')}. {material.embargo_mode === 'block' ? 'Pobieranie zablokowane dla partnerów.' : 'Materiał dostępny przed terminem. Zakaz wcześniejszej publikacji.'}</p>}
    <p className="press-body">{material.description}</p>
    <dl className="press-rights"><div><dt>Autor</dt><dd>{material.author}</dd></div><div><dt>Podpis</dt><dd>{material.credit}</dd></div><div><dt>Warunki wykorzystania</dt><dd>{material.license}</dd></div><div><dt>Kontakt</dt><dd><a href={`mailto:${material.contact_email}`}>{material.contact_email}</a></dd></div></dl>
    <dl className="press-rights"><div><dt>Właściciel praw / źródło</dt><dd>{material.rights_owner || material.author} · {material.source || 'Nie podano'}</dd></div><div><dt>Dozwolone media</dt><dd>{material.allowed_media?.length ? material.allowed_media.map(value => pressMedia[value]).join(', ') : 'Zgodnie z warunkami licencji'}</dd></div>{material.license_expires_at && <div><dt>Licencja ważna do</dt><dd>{new Date(material.license_expires_at).toLocaleString('pl-PL')}</dd></div>}{material.contact_name && <div><dt>Osoba kontaktowa</dt><dd>{material.contact_name} {material.contact_phone}</dd></div>}</dl>
    {(material.radio_short || material.radio_long) && <section><h3>Dla radia</h3>{material.radio_short && <><h4>20–30 sekund</h4><p className="press-body">{material.radio_short}</p></>}{material.radio_long && <details><summary>60–90 sekund</summary><p className="press-body">{material.radio_long}</p></details>}</section>}
    {material.guest && <p>Gość: {material.guest}</p>}
    {material.youtube_url && <a href={material.youtube_url} target="_blank" rel="noopener noreferrer">Otwórz materiał w YouTube</a>}
    {material.transcript && <details><summary>Transkrypcja</summary><p className="press-body">{material.transcript}</p></details>}
    <Feedback error={error} />
    {!mine && <BookmarkPanel materialId={material.id} userId={userId} />}
    {material.attachments.length > 0 && !mine && <button disabled={busy || blocked} onClick={async () => { setBusy(true); setError(''); try { await downloadPressResource(`/press/materials/${material.id}/package/`, `ik-media-${material.id}.zip`); refresh(); } catch (failure) { setError(pressError(failure)); } finally { setBusy(false); } }}><Archive size={18} />Pobierz pakiet ZIP</button>}
    <h3>Pliki ({material.attachments.length})</h3>
    {!material.attachments.length && <p className="press-muted">Brak załączników.</p>}
    {material.attachments.map(attachment => <section key={attachment.id}><div className="press-file"><FileText size={20} /><span>{attachment.original_name}<small>{Math.max(1, Math.round(attachment.size / 1024))} KB</small></span>{!mine && <button disabled={busy || blocked || (!admin && !!attachment.license_expires_at && new Date(attachment.license_expires_at) <= new Date())} title={`Pobierz ${attachment.original_name}`} aria-label={`Pobierz ${attachment.original_name}`} onClick={async () => { setBusy(true); setError(''); try { await downloadPressFile(attachment); refresh(); } catch (failure) { setError(pressError(failure)); } finally { setBusy(false); } }}><Download size={20} /></button>}</div><div className="press-attachment-license"><p>{attachment.license || material.license}</p><p>Autor: {attachment.author || material.author} · Podpis: {attachment.credit || material.credit}</p><p>Właściciel: {attachment.rights_owner || material.rights_owner || material.author} · Źródło: {attachment.source || material.source || 'Nie podano'}</p><p>Media: {(attachment.allowed_media?.length ? attachment.allowed_media : material.allowed_media ?? []).map(value => pressMedia[value]).join(', ') || 'Zgodnie z licencją'}</p>{attachment.license_expires_at && <p>Ważna do: {new Date(attachment.license_expires_at).toLocaleString('pl-PL')}</p>}</div>{editable && <AttachmentRights attachment={attachment} refresh={refresh} />}</section>)}
    {editable && <><button onClick={edit}><FileText size={18} />Edytuj materiał</button><form onSubmit={upload} className="press-upload"><label>Załącznik (do 25 MB)<input name="file" type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,.mp3,.wav,.mp4,.zip,.docx,.txt" /></label><button disabled={busy}><Upload size={18} />Dodaj plik</button></form></>}
    {(admin || mine) && <WorkflowPanel material={material} userId={userId} admin={admin} refresh={refresh} />}
  </article>;
}

function Library({ admin, userId, mine = false, saved = false, initialKind = '', urgent = false }: { admin: boolean; userId: number; mine?: boolean; saved?: boolean; initialKind?: string; urgent?: boolean }) {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState(initialKind);
  const [region, setRegion] = useState('');
  const [workflow, setWorkflow] = useState('');
  const [personalized, setPersonalized] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number | null>(() => {
    const value = searchParams.get('material');
    return value && /^\d+$/.test(value) ? Number(value) : null;
  });
  const [editor, setEditor] = useState<PressMaterial | 'new' | null>(null);
  const queryClient = useQueryClient();
  const params = { search, kind, page, region, workflow, mine: mine ? '1' : '', saved: saved ? '1' : '', personalized: personalized ? '1' : '', urgent: urgent ? '1' : '' };
  const materials = useQuery({ queryKey: ['press', userId, 'materials', params], queryFn: async () => (await apiClient.get<PressPage<PressMaterial>>('/press/materials/', { params })).data, retry: false, staleTime: 0, gcTime: 0 });
  const detail = useQuery({ queryKey: ['press', userId, 'material', selected], queryFn: async () => (await apiClient.get<PressMaterial>(`/press/materials/${selected}/`)).data, enabled: selected !== null, retry: false, staleTime: 0, gcTime: 0 });
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ['press', userId] }); };
  return <>
    <div className="press-row press-toolbar"><h2>{mine ? 'Moje zgłoszenia' : saved ? 'Zapisane materiały' : urgent ? 'Media Alert' : initialKind === 'program' ? 'Oto Nadchodzi' : 'Materiały prasowe'}</h2>{(admin || mine) && <button className="press-primary" onClick={() => setEditor('new')}><Plus size={18} />Nowy materiał</button>}</div>
    {editor && <MaterialEditor key={editor === 'new' ? 'new' : editor.id} admin={admin} material={editor === 'new' ? undefined : editor} onDone={id => { setSelected(id); refresh(); }} onClose={() => setEditor(null)} />}
    <div className="press-filters"><label><span><Search size={16} />Szukaj materiałów</span><input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></label><label>Format<select value={kind} onChange={event => { setKind(event.target.value); setPage(1); }}><option value="">Wszystkie formaty</option>{Object.entries(pressKinds).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
    <div className="press-filters"><label>Region<input value={region} onChange={event => { setRegion(event.target.value); setPage(1); }} /></label>{admin ? <label>Status<select value={workflow} onChange={event => { setWorkflow(event.target.value); setPage(1); }}><option value="">Wszystkie statusy</option>{Object.entries(pressWorkflow).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label> : !mine && <label className="press-checkbox"><input type="checkbox" checked={personalized} onChange={event => { setPersonalized(event.target.checked); setPage(1); }} />Moje zainteresowania</label>}</div>
    {materials.isPending && <p role="status">Ładowanie materiałów…</p>}
    {materials.isError ? <><Feedback error={pressError(materials.error)} /><button onClick={() => void materials.refetch()}>Spróbuj ponownie</button></> : <div className="press-library">
      <section aria-label="Lista materiałów">{materials.data?.results.map(material => <button className={`press-item ${selected === material.id ? 'selected' : ''}`} key={material.id} onClick={() => setSelected(material.id)}><span className="press-tag">{pressKinds[material.kind]}{(admin || mine) && ` · ${pressWorkflow[material.workflow]}`}{material.urgent && ' · PILNE'}</span><strong>{material.title}</strong><span>{material.author} · Pliki: {material.attachments.length}</span></button>)}{materials.data?.count === 0 && <p className="press-empty">Brak materiałów spełniających kryteria.</p>}<Pages data={materials.data} page={page} setPage={setPage} /></section>
      <div>{selected !== null && detail.isPending && <p role="status">Ładowanie materiału…</p>}{detail.isError && <><Feedback error={pressError(detail.error)} /><button onClick={() => void detail.refetch()}>Spróbuj ponownie</button></>}{selected !== null && detail.data && !detail.isError && <MaterialDetail key={detail.data.id} material={detail.data} admin={admin} mine={mine} userId={userId} refresh={refresh} close={() => setSelected(null)} edit={() => setEditor(detail.data!)} />}</div>
    </div>}
  </>;
}

function Review({ access, onDecision }: { access: PressAccess; onDecision: (message: string) => void }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function decide(status: string) {
    setBusy(true); setError('');
    try { const { data } = await apiClient.post<Decision>(`/press/admin/access/${access.id}/decision/`, { status, decision_note: note }); onDecision(data.notification_sent ? 'Decyzja zapisana, e-mail wysłany.' : 'Decyzja zapisana. Nie udało się wysłać e-maila.'); }
    catch (failure) { setError(pressError(failure)); }
    finally { setBusy(false); }
  }
  async function technical(enabled: boolean) { setBusy(true); setError(''); try { await apiClient.post(`/press/admin/access/${access.id}/technical/`, { enabled }); onDecision(enabled ? 'Przyznano dostęp techniczny.' : 'Cofnięto dostęp techniczny i unieważniono klucz.'); } catch (failure) { setError(pressError(failure)); } finally { setBusy(false); } }
  return <article className="press-review"><div className="press-row"><h3>{access.full_name}</h3><span className="press-tag">{pressStatuses[access.status]}</span></div><p>{access.newsroom} · {access.email} · ID konta: {access.user_id}</p><p className="press-body">{access.motivation}</p><div className="press-actions"><a href={access.portfolio} target="_blank" rel="noopener noreferrer">Publikacje autora</a>{access.website && <a href={access.website} target="_blank" rel="noopener noreferrer">Strona redakcji</a>}</div>{access.decision_note && <p>Ostatnia decyzja: {access.decision_note}</p>}
    {access.status === 'approved' && <label className="press-checkbox press-technical"><input type="checkbox" checked={access.api_enabled ?? false} disabled={busy} onChange={event => void technical(event.target.checked)} />Dostęp techniczny API / RSS</label>}
    <Feedback error={error} />
    {access.status !== 'rejected' && <><label>Uzasadnienie decyzji<textarea rows={2} maxLength={3000} value={note} onChange={event => setNote(event.target.value)} /></label><div className="press-actions">{(access.status === 'pending' || access.status === 'suspended') && <button className="press-primary" disabled={busy} onClick={() => void decide('approved')}><Check size={18} />{access.status === 'suspended' ? 'Przywróć dostęp' : 'Zatwierdź'}</button>}{access.status === 'pending' && <button disabled={busy || !note.trim()} onClick={() => void decide('rejected')}><X size={18} />Odrzuć</button>}{access.status === 'approved' && <button disabled={busy || !note.trim()} onClick={() => void decide('suspended')}><X size={18} />Zawieś dostęp</button>}</div></>}
  </article>;
}

function Administration({ userId }: { userId: number }) {
  const [tab, setTab] = useState('dashboard');
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('pending');
  const requests = useQuery({ queryKey: ['press', userId, 'requests', page, filter], queryFn: async () => (await apiClient.get<PressPage<PressAccess>>('/press/admin/access/', { params: { page, status: filter } })).data, enabled: tab === 'access', retry: false, gcTime: 0 });
  const downloads = useQuery({ queryKey: ['press', userId, 'downloads', page], queryFn: async () => (await apiClient.get<PressPage<PressDownload>>('/press/admin/downloads/', { params: { page } })).data, enabled: tab === 'downloads', retry: false, gcTime: 0 });
  return <div className="press-workspace"><nav className="press-sidebar" aria-label="Zarządzanie prasą">{[{key:'dashboard', label:'Pulpit', icon:LayoutDashboard}, {key:'access', label:'Partnerzy', icon:Users}, {key:'materials', label:'Materiały', icon:FileText}, {key:'interests', label:'Zainteresowanie tematami', icon:Bell}, {key:'downloads', label:'Historia pobrań', icon:BarChart3}].map(({key, label, icon:Icon}) => <button aria-current={tab === key ? 'page' : undefined} key={key} onClick={() => { setTab(key); setPage(1); }}><Icon size={18} />{label}</button>)}</nav><div className="press-workspace-content">
    {tab === 'dashboard' && <Dashboard userId={userId} admin />}
    {tab === 'interests' && <InterestsPanel userId={userId} />}
    {tab === 'materials' && <Library admin userId={userId} />}
    {tab === 'access' && <><Feedback message={message} /><label className="press-filter">Status<select value={filter} onChange={event => { setFilter(event.target.value); setPage(1); }}><option value="">Wszystkie</option>{Object.entries(pressStatuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>{requests.isPending && <p role="status">Ładowanie wniosków…</p>}{requests.isError ? <><Feedback error={pressError(requests.error)} /><button onClick={() => void requests.refetch()}>Spróbuj ponownie</button></> : <>{requests.data?.results.map(access => <Review key={access.id} access={access} onDecision={message => { setMessage(message); void requests.refetch(); }} />)}{requests.data?.count === 0 && <p className="press-empty">Brak wniosków w tym statusie.</p>}<Pages data={requests.data} page={page} setPage={setPage} /></>}</>}
    {tab === 'downloads' && <>{downloads.isPending && <p role="status">Ładowanie historii…</p>}{downloads.isError ? <><Feedback error={pressError(downloads.error)} /><button onClick={() => void downloads.refetch()}>Spróbuj ponownie</button></> : <><div className="press-table"><table><thead><tr><th>Data</th><th>Konto</th><th>Materiał</th><th>Plik</th></tr></thead><tbody>{downloads.data?.results.map(entry => <tr key={entry.id}><td>{new Date(entry.created_at).toLocaleString('pl-PL')}</td><td>{entry.email || 'Usunięte konto'}</td><td>{entry.material}</td><td>{entry.filename}</td></tr>)}</tbody></table></div>{downloads.data?.count === 0 && <p className="press-empty">Brak pobrań.</p>}<Pages data={downloads.data} page={page} setPage={setPage} /></>}</>}
  </div></div>;
}

function PartnerWorkspace({ userId, allowed, canSubmit, application }: { userId: number; allowed: boolean; canSubmit: boolean; application: React.ReactNode }) {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(allowed ? searchParams.has('material') ? 'materials' : 'dashboard' : canSubmit ? 'mine' : 'access');
  const items = allowed ? [{key:'dashboard',label:'Pulpit',icon:LayoutDashboard},{key:'materials',label:'Biblioteka',icon:FileText},{key:'program',label:'Oto Nadchodzi',icon:Archive},{key:'alerts',label:'Media Alert',icon:Bell},{key:'saved',label:'Zapisane',icon:Bookmark},{key:'preferences',label:'Zainteresowania i alerty',icon:Settings2},{key:'integrations',label:'API i RSS',icon:KeyRound}] : [{key:'access',label:'Dostęp dla mediów',icon:ShieldCheck}];
  if (canSubmit) items.push({key:'mine',label:'Moje zgłoszenia',icon:Upload});
  return <div className="press-workspace"><nav className="press-sidebar" aria-label="Panel partnera">{items.map(({key,label,icon:Icon}) => <button key={key} aria-current={tab === key ? 'page' : undefined} onClick={() => setTab(key)}><Icon size={18} />{label}</button>)}</nav><div className="press-workspace-content">
    {tab === 'dashboard' && allowed && <Dashboard userId={userId} />}
    {tab === 'preferences' && allowed && <PreferencesPanel userId={userId} />}
    {tab === 'integrations' && allowed && <IntegrationsPanel userId={userId} />}
    {['materials','saved','program','alerts'].includes(tab) && allowed && <Library key={tab} admin={false} userId={userId} saved={tab === 'saved'} initialKind={tab === 'program' ? 'program' : ''} urgent={tab === 'alerts'} />}
    {tab === 'mine' && canSubmit && <Library admin={false} userId={userId} mine />}
    {tab === 'access' && application}
  </div></div>;
}

export default function PressHub({ admin = false }: { admin?: boolean }) {
  const hydrated = useHydration();
  const { user, isAuthenticated } = useAuthStore();
  const session = useQuery({ queryKey: ['press', user?.id, 'access'], queryFn: async () => (await apiClient.get<AccessState>('/press/access/')).data, enabled: hydrated && isAuthenticated, retry: false, staleTime: 0, gcTime: 0, refetchOnMount: 'always' });
  const allowed = session.data?.is_staff || session.data?.access?.status === 'approved';
  return <div className="press-hub"><header className="press-header"><div><span className="press-eyebrow">INICJATYWA KATOLICKA / DLA MEDIÓW</span><h1>IK Media Hub</h1><p>{admin ? 'Panel redakcyjny' : 'Strefa prasowa'}</p></div>{session.data?.is_staff && <Link href={admin ? '/dla-mediow' : '/admin/prasa'}>{admin ? 'Strefa prasowa' : 'Panel redakcyjny'}<ChevronRight size={18} /></Link>}</header>
    {!hydrated ? <p role="status">Ładowanie…</p> : !isAuthenticated || !user ? <section className="press-section"><h2>Dostęp dla mediów</h2><div className="press-actions"><Link className="press-primary" href={`/logowanie?redirect=${admin ? '/admin/prasa' : '/dla-mediow'}`}>Zaloguj się</Link><Link href="/rejestracja">Utwórz konto</Link></div></section> : session.isPending ? <p role="status">Sprawdzanie dostępu…</p> : session.isError ? <><Feedback error={pressError(session.error)} /><button onClick={() => void session.refetch()}>Spróbuj ponownie</button></> : admin ? session.data?.is_staff ? <Administration userId={user.id} /> : <Feedback error="Panel jest dostępny tylko dla administratorów." /> : <PartnerWorkspace key={`${user.id}-${allowed}`} userId={user.id} allowed={!!allowed} canSubmit={!!session.data?.can_submit} application={<Application access={session.data?.access ?? null} onDone={() => void session.refetch()} />} />}
  </div>;
}