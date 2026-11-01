'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, FileText, Plus, RotateCcw, Search } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import {
  pressError,
  pressExtendedFeaturesEnabled,
  pressKinds,
  pressPartnerToolsEnabled,
  pressWorkflow,
  PressMaterial,
  PressPage,
} from '@/lib/api/press';
import { MaterialDetail } from './MaterialDetail';
import { MaterialEditor } from './MaterialEditor';
import { Feedback, Pages } from './PressFeedback';

function attachmentSummary(material: PressMaterial): string {
  const counts = new Map<string, number>();
  for (const attachment of material.attachments) {
    const extension = attachment.original_name.split('.').pop()?.toLowerCase() || '';
    const type = ['jpg', 'jpeg', 'png', 'webp'].includes(extension)
      ? 'zdjęcia'
      : ['mp3', 'wav'].includes(extension)
        ? 'audio'
        : extension === 'mp4'
          ? 'wideo'
          : ['pdf', 'docx', 'txt', 'zip'].includes(extension)
            ? extension.toUpperCase()
            : 'pliki';
    counts.set(type, (counts.get(type) || 0) + 1);
  }
  return counts.size ? [...counts].map(([type, count]) => `${count} × ${type}`).join(' · ') : 'Bez załączników';
}

export function Library({
  admin,
  userId,
  mine = false,
  saved = false,
  initialKind = '',
  urgent = false,
}: {
  admin: boolean;
  userId: number;
  mine?: boolean;
  saved?: boolean;
  initialKind?: string;
  urgent?: boolean;
}) {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState(initialKind);
  const [region, setRegion] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [ordering, setOrdering] = useState('-available_from');
  const [workflow, setWorkflow] = useState('');
  const [personalized, setPersonalized] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number | null>(() => {
    const value = searchParams.get('material');
    return value && /^\d+$/.test(value) ? Number(value) : null;
  });
  const [editor, setEditor] = useState<PressMaterial | 'new' | null>(null);
  const queryClient = useQueryClient();
  const params = {
    search,
    kind,
    page,
    region,
    workflow,
    date_from: dateFrom,
    date_to: dateTo,
    ordering,
    mine: mine ? '1' : '',
    saved: saved ? '1' : '',
    personalized: personalized ? '1' : '',
    urgent: urgent ? '1' : '',
  };
  const materials = useQuery({
    queryKey: ['press', userId, 'materials', params],
    queryFn: async () => (await apiClient.get<PressPage<PressMaterial>>('/press/materials/', { params })).data,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
  const detail = useQuery({
    queryKey: ['press', userId, 'material', selected],
    queryFn: async () => (await apiClient.get<PressMaterial>(`/press/materials/${selected}/`)).data,
    enabled: selected !== null,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['press', userId] });
  };
  return (
    <>
      <div className="press-row press-toolbar">
        <h2>
          {mine
            ? 'Moje zgłoszenia'
            : saved
              ? 'Zapisane materiały'
              : urgent
                ? 'Media Alert'
                : initialKind === 'program'
                  ? 'Oto Nadchodzi'
                  : 'Materiały prasowe'}
        </h2>
        {(admin || mine) && (
          <button className="press-primary" onClick={() => setEditor('new')}>
            <Plus size={18} />
            Nowy materiał
          </button>
        )}
      </div>
      {editor && (
        <MaterialEditor
          key={editor === 'new' ? 'new' : editor.id}
          admin={admin}
          material={editor === 'new' ? undefined : editor}
          onDone={id => {
            setSelected(id);
            refresh();
          }}
          onClose={() => setEditor(null)}
        />
      )}
      <div className="press-filters">
        <label>
          <span>
            <Search size={16} />
            Szukaj materiałów
          </span>
          <input
            type="search"
            value={search}
            onChange={event => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          Format
          <select
            value={kind}
            onChange={event => {
              setKind(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Wszystkie formaty</option>
            {Object.entries(pressKinds)
              .filter(([key]) => pressExtendedFeaturesEnabled || key !== 'program')
              .map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
          </select>
        </label>
      </div>
      <div className="press-filters">
        <label>
          Region
          <select
            value={region}
            onChange={event => {
              setRegion(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Wszystkie regiony</option>
            {region && !materials.data?.regions?.includes(region) && <option value={region}>{region}</option>}
            {materials.data?.regions?.map(value => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        {admin ? (
          <label>
            Status
            <select
              value={workflow}
              onChange={event => {
                setWorkflow(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Wszystkie statusy</option>
              {Object.entries(pressWorkflow).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        ) : (
          pressPartnerToolsEnabled &&
          !mine && (
            <label className="press-checkbox">
              <input
                type="checkbox"
                checked={personalized}
                onChange={event => {
                  setPersonalized(event.target.checked);
                  setPage(1);
                }}
              />
              Moje zainteresowania
            </label>
          )
        )}
      </div>
      <div className="press-date-filters">
        <label>
          Dostępny od — początek
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={event => {
              setDateFrom(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          Dostępny od — koniec
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={event => {
              setDateTo(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          Sortowanie
          <select
            value={ordering}
            onChange={event => {
              setOrdering(event.target.value);
              setPage(1);
            }}
          >
            <option value="-available_from">Najnowsze</option>
            <option value="available_from">Najstarsze</option>
            <option value="title">Tytuł A–Z</option>
            <option value="-title">Tytuł Z–A</option>
          </select>
        </label>
      </div>
      <div className="press-row press-results-toolbar">
        <span className="press-muted" role="status">
          {materials.data ? `Wyniki: ${materials.data.count}` : 'Ładowanie wyników...'}
        </span>
        {(search ||
          kind ||
          region ||
          workflow ||
          dateFrom ||
          dateTo ||
          personalized ||
          ordering !== '-available_from') && (
          <button
            type="button"
            title="Wyczyść filtry"
            aria-label="Wyczyść filtry"
            onClick={() => {
              setSearch('');
              setKind(initialKind);
              setRegion('');
              setWorkflow('');
              setDateFrom('');
              setDateTo('');
              setPersonalized(false);
              setOrdering('-available_from');
              setPage(1);
            }}
          >
            <RotateCcw size={18} />
          </button>
        )}
      </div>
      {materials.isPending && <p role="status">Ładowanie materiałów…</p>}
      {materials.isError ? (
        <>
          <Feedback error={pressError(materials.error)} />
          <button onClick={() => void materials.refetch()}>Spróbuj ponownie</button>
        </>
      ) : (
        <div className="press-library">
          <section aria-label="Lista materiałów">
            {materials.data?.results.map(material => (
              <button
                className={`press-item ${selected === material.id ? 'selected' : ''}`}
                key={material.id}
                aria-pressed={selected === material.id}
                onClick={() => setSelected(material.id)}
              >
                <span className="press-tag">
                  {pressKinds[material.kind]}
                  {(admin || mine) && ` · ${pressWorkflow[material.workflow]}`}
                  {pressExtendedFeaturesEnabled && material.urgent && ' · PILNE'}
                </span>
                <span className="press-item-heading">
                  <strong>{material.title}</strong>
                  <ChevronRight size={18} aria-hidden="true" />
                </span>
                <span className="press-item-meta">
                  {material.author} · Dostępny od{' '}
                  <time dateTime={material.available_from}>
                    {new Date(material.available_from).toLocaleDateString('pl-PL')}
                  </time>
                </span>
                <span className="press-item-summary">{material.description}</span>
                <span className="press-item-files">
                  <FileText size={15} aria-hidden="true" />
                  {attachmentSummary(material)}
                </span>
              </button>
            ))}
            {materials.data?.count === 0 && <p className="press-empty">Brak materiałów spełniających kryteria.</p>}
            <Pages data={materials.data} page={page} setPage={setPage} />
          </section>
          <div>
            {selected === null && !!materials.data?.count && (
              <div className="press-detail-empty">
                <FileText size={32} aria-hidden="true" />
                <h3>Wybierz materiał</h3>
              </div>
            )}
            {selected !== null && detail.isPending && <p role="status">Ładowanie materiału…</p>}
            {detail.isError && (
              <>
                <Feedback error={pressError(detail.error)} />
                <button onClick={() => void detail.refetch()}>Spróbuj ponownie</button>
              </>
            )}
            {selected !== null && detail.data && !detail.isError && (
              <MaterialDetail
                key={detail.data.id}
                material={detail.data}
                admin={admin}
                mine={mine}
                userId={userId}
                refresh={refresh}
                close={() => setSelected(null)}
                edit={() => setEditor(detail.data!)}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
