'use client';

import { FormEvent, useDeferredValue, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Save, Search, X } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/lib/api/client';
import {
  pressError,
  pressExtendedFeaturesEnabled,
  pressKinds,
  pressLocalDate,
  splitPressValues,
  PressMaterial,
  PressPage,
} from '@/lib/api/press';
import { Feedback } from './PressFeedback';
import { RightsFields } from './WorkspacePanels';

type EventChoice = { id: number; title: string; start_date: string; organizer: string; status: string };

function EventSelector({ material }: { material?: PressMaterial }) {
  const userId = useAuthStore(state => state.user?.id);
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<{ id: number; title: string } | null>(
    material?.event ? { id: material.event, title: material.event_title || 'Wybrane wydarzenie' } : null,
  );
  const events = useQuery({
    queryKey: ['press', userId, 'event-choices', deferredSearch, page],
    queryFn: async () =>
      (await apiClient.get<PressPage<EventChoice>>('/press/events/', { params: { search: deferredSearch, page } }))
        .data,
    enabled: open,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
  function close() {
    dialog.current?.close();
    setOpen(false);
  }
  return (
    <div className="press-event-selector">
      <span id="press-event-label">Powiązane wydarzenie (opcjonalne)</span>
      <input type="hidden" name="event" value={selected?.id ?? ''} />
      {selected && <strong className="press-event-title">{selected.title}</strong>}
      <div className="press-actions">
        <button
          type="button"
          onClick={() => {
            dialog.current?.showModal();
            setOpen(true);
          }}
        >
          <Search size={18} />
          {selected ? 'Zmień wydarzenie' : 'Wybierz wydarzenie'}
        </button>
        {selected && (
          <button type="button" title="Usuń powiązanie" aria-label="Usuń powiązanie" onClick={() => setSelected(null)}>
            <X size={18} />
          </button>
        )}
      </div>
      <dialog
        ref={dialog}
        className="press-event-dialog"
        aria-labelledby="press-event-dialog-title"
        onClose={() => setOpen(false)}
        onCancel={() => setOpen(false)}
        onKeyDown={event => {
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            close();
          }
        }}
      >
        <div className="press-row">
          <h2 id="press-event-dialog-title">Wybierz wydarzenie</h2>
          <button type="button" onClick={close} title="Zamknij wybór wydarzenia" aria-label="Zamknij wybór wydarzenia">
            <X size={20} />
          </button>
        </div>
        <label className="press-event-search">
          Szukaj wydarzenia
          <input
            type="search"
            value={search}
            onChange={event => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <div className="press-event-results" aria-busy={events.isFetching}>
          {events.isPending && <p role="status">Ładowanie wydarzeń...</p>}
          {events.isError && (
            <>
              <Feedback error={pressError(events.error)} />
              <button type="button" onClick={() => void events.refetch()}>
                Spróbuj ponownie
              </button>
            </>
          )}
          {!events.isError && events.data?.count === 0 && <p>Brak wydarzeń spełniających kryteria.</p>}
          {!events.isError &&
            events.data?.results.map(event => (
              <button
                type="button"
                className="press-item"
                key={event.id}
                onClick={() => {
                  setSelected(event);
                  close();
                }}
              >
                <strong>{event.title}</strong>
                <span>
                  {new Date(event.start_date).toLocaleDateString('pl-PL')} · {event.organizer} · {event.status}
                </span>
              </button>
            ))}
        </div>
        {events.data && (events.data.next || events.data.previous) && (
          <nav className="press-pagination" aria-label="Strony wydarzeń">
            <button
              type="button"
              title="Poprzednia strona"
              aria-label="Poprzednia strona"
              disabled={!events.data.previous || events.isFetching}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={18} />
            </button>
            <span>
              Strona {page} · {events.data.count} wyników
            </span>
            <button
              type="button"
              title="Następna strona"
              aria-label="Następna strona"
              disabled={!events.data.next || events.isFetching}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight size={18} />
            </button>
          </nav>
        )}
      </dialog>
    </div>
  );
}

export function MaterialEditor({
  material,
  admin,
  onDone,
  onClose,
}: {
  material?: PressMaterial;
  admin: boolean;
  onDone: (id: number) => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form.entries());
    const payload = {
      ...values,
      event: values.event ? Number(values.event) : null,
      allowed_media: form.getAll('allowed_media'),
      tags: splitPressValues(form.get('tags')),
      selected_partners: splitPressValues(form.get('selected_partners')).map(Number),
      ...(pressExtendedFeaturesEnabled ? { urgent: values.urgent === 'on' } : {}),
      license_expires_at: values.license_expires_at ? new Date(String(values.license_expires_at)).toISOString() : null,
      embargo_until: values.embargo_until ? new Date(String(values.embargo_until)).toISOString() : null,
      available_from: values.available_from
        ? new Date(String(values.available_from)).toISOString()
        : new Date().toISOString(),
    };
    setBusy(true);
    setError('');
    try {
      const response = material
        ? await apiClient.patch<PressMaterial>(`/press/materials/${material.id}/`, payload)
        : await apiClient.post<PressMaterial>('/press/materials/', payload);
      onDone(response.data.id);
      onClose();
    } catch (failure) {
      setError(pressError(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="press-form press-section" onSubmit={submit}>
      <div className="press-row">
        <h2>{material ? 'Edycja materiału' : 'Nowy materiał'}</h2>
        <button type="button" onClick={onClose} title="Zamknij edycję" aria-label="Zamknij edycję">
          <X size={20} />
        </button>
      </div>
      <Feedback error={error} />
      <label>
        Tytuł (wymagane)
        <input name="title" required maxLength={250} defaultValue={material?.title} />
      </label>
      <label>
        Treść / opis (wymagane)
        <textarea name="description" rows={8} required maxLength={20000} defaultValue={material?.description} />
      </label>
      <div className="press-fields">
        <label>
          Format (opcjonalne, domyślnie komunikat)
          <select name="kind" defaultValue={material?.kind ?? 'release'}>
            {material?.kind === 'program' && !pressExtendedFeaturesEnabled && (
              <option value="program" hidden>
                Materiał prasowy
              </option>
            )}
            {Object.entries(pressKinds)
              .filter(([key]) => pressExtendedFeaturesEnabled || key !== 'program')
              .map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
          </select>
        </label>
        <EventSelector material={material} />
        <label>
          Autor (wymagane)
          <input name="author" required maxLength={200} defaultValue={material?.author} />
        </label>
        <label>
          Podpis przy publikacji (wymagane)
          <input
            name="credit"
            required
            maxLength={300}
            placeholder="Np. fot. Jan Kowalski / Fundacja"
            defaultValue={material?.credit}
          />
        </label>
        <label>
          E-mail kontaktowy dla mediów (wymagane)
          <input name="contact_email" type="email" required defaultValue={material?.contact_email} />
        </label>
        <label>
          Dostępny od (opcjonalne, domyślnie teraz)
          <input name="available_from" type="datetime-local" defaultValue={pressLocalDate(material?.available_from)} />
        </label>
        <label>
          Region (opcjonalne)
          <input name="region" maxLength={100} defaultValue={material?.region} />
        </label>
        <label>
          Miasto (opcjonalne)
          <input name="city" maxLength={100} defaultValue={material?.city} />
        </label>
        <label>
          Temat (opcjonalne)
          <input name="topic" maxLength={100} defaultValue={material?.topic} />
        </label>
        <label>
          Tagi (opcjonalne, oddzielone przecinkami)
          <input name="tags" defaultValue={material?.tags?.join(', ')} />
        </label>
        <label>
          Osoba kontaktowa (opcjonalne)
          <input name="contact_name" maxLength={200} defaultValue={material?.contact_name} />
        </label>
        <label>
          Telefon dla mediów (opcjonalne)
          <input name="contact_phone" type="tel" maxLength={40} defaultValue={material?.contact_phone} />
        </label>
      </div>
      <label>
        Licencja i warunki wykorzystania (wymagane)
        <textarea
          name="license"
          rows={3}
          required
          maxLength={3000}
          placeholder="Np. Do nieodpłatnej publikacji redakcyjnej w związku z wydarzeniem, z podaniem autora i źródła. Bez wykorzystania reklamowego."
          defaultValue={material?.license}
        />
      </label>
      <RightsFields rights={material} />
      {admin && (
        <div className="press-fields">
          <label>
            Dostęp (opcjonalne, domyślnie partnerzy)
            <select name="audience" defaultValue={material?.audience ?? 'partners'}>
              <option value="partners">Partnerzy</option>
              <option value="selected">Wybrani partnerzy</option>
              <option value="internal">Wewnętrzny</option>
            </select>
          </label>
          <label>
            ID kont wybranych partnerów (opcjonalne, oddzielone przecinkami)
            <input
              name="selected_partners"
              inputMode="numeric"
              pattern="[0-9, ]*"
              defaultValue={material?.selected_partners?.join(', ')}
            />
          </label>
        </div>
      )}
      <div className="press-fields">
        <label>
          Embargo do (opcjonalne)
          <input name="embargo_until" type="datetime-local" defaultValue={pressLocalDate(material?.embargo_until)} />
        </label>
        <label>
          Tryb embarga (opcjonalne, domyślnie blokada)
          <select name="embargo_mode" defaultValue={material?.embargo_mode ?? 'block'}>
            <option value="block">Zablokuj pobieranie</option>
            <option value="notice">Udostępnij z informacją o zakazie publikacji</option>
          </select>
        </label>
      </div>
      {pressExtendedFeaturesEnabled && (
        <>
          <label className="press-checkbox">
            <input name="urgent" type="checkbox" defaultChecked={material?.urgent} />
            Pilny materiał (opcjonalne)
          </label>
          <details className="press-editor-details">
            <summary>Dla radia (opcjonalne)</summary>
            <label>
              Informacja 20–30 sekund (opcjonalne)
              <textarea name="radio_short" rows={4} maxLength={3000} defaultValue={material?.radio_short} />
            </label>
            <label>
              Informacja 60–90 sekund (opcjonalne)
              <textarea name="radio_long" rows={6} maxLength={8000} defaultValue={material?.radio_long} />
            </label>
          </details>
          <details className="press-editor-details">
            <summary>Program / wywiad / transkrypcja (opcjonalne)</summary>
            <label>
              Gość (opcjonalne)
              <input name="guest" maxLength={200} defaultValue={material?.guest} />
            </label>
            <label>
              Adres filmu YouTube (opcjonalne)
              <input name="youtube_url" type="url" defaultValue={material?.youtube_url} />
            </label>
            <label>
              Transkrypcja (opcjonalne)
              <textarea name="transcript" rows={8} maxLength={100000} defaultValue={material?.transcript} />
            </label>
          </details>
        </>
      )}
      <button className="press-primary" disabled={busy}>
        <Save size={18} />
        {busy ? 'Zapisywanie…' : 'Zapisz materiał'}
      </button>
    </form>
  );
}
