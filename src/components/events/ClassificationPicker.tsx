'use client';

// Wybór wartości z nowego podziału: Rodzaj / Dla kogo / Tematyka / Zasoby katolickie.
// mode="event"       — formularz wydarzenia: limity, „Dla wszystkich” wyklucza inne grupy, Rodzaj obowiązkowy;
// mode="filter"      — wyszukiwarka: bez limitów, wartości bez aktualnych wydarzeń ukryte;
// mode="preferences" — newsletter i „Moje zainteresowania”: bez limitów.
import { Loader2, RefreshCw, X } from 'lucide-react';
import type { ClassificationChoice, ClassificationDimension, ClassificationField } from '@/types';

export type ClassificationPickerMode = 'event' | 'filter' | 'preferences';

export function toggleClassificationValue(
  choice: ClassificationChoice, dimension: ClassificationDimension, slug: string, mode: ClassificationPickerMode,
): ClassificationChoice {
  const current = choice[dimension.field];
  if (current.includes(slug)) {
    return { ...choice, [dimension.field]: current.filter(item => item !== slug) };
  }
  let next = [...current, slug];
  if (mode === 'event') {
    const isExclusive = (item: string) => dimension.values.find(value => value.slug === item)?.is_exclusive;
    next = isExclusive(slug) ? [slug] : next.filter(item => !isExclusive(item));
    if (dimension.limit && next.length > dimension.limit) return choice;
  }
  return { ...choice, [dimension.field]: next };
}

interface ClassificationPickerProps {
  dimensions: ClassificationDimension[] | undefined;
  value: ClassificationChoice;
  onChange: (value: ClassificationChoice) => void;
  fields: ClassificationField[];
  mode: ClassificationPickerMode;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  errors?: Partial<Record<ClassificationField, string>>;
  hints?: Partial<Record<ClassificationField, string>>;
  showCounts?: boolean;
  // Wyszukiwarka układa pola w siatce i przewija długie listy.
  scrollable?: boolean;
  className?: string;
  groupClassName?: string;
}

export function ClassificationPicker({
  dimensions, value, onChange, fields, mode, loading, error, onRetry, errors, hints, showCounts,
  scrollable, className = 'space-y-6', groupClassName = '',
}: ClassificationPickerProps) {
  if (!dimensions?.length) {
    if (loading) {
      return (
        <p role="status" className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          Ładowanie listy wartości…
        </p>
      );
    }
    return (
      <div className="space-y-2 text-sm">
        <p role={error ? 'alert' : 'status'} className="text-slate-600">
          {error ? 'Nie udało się pobrać listy wartości.' : 'Brak dostępnych wartości.'}
        </p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 text-primary-700 hover:underline">
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Spróbuj ponownie
          </button>
        )}
      </div>
    );
  }

  const shown = fields
    .map(field => dimensions.find(dimension => dimension.field === field))
    .filter((dimension): dimension is ClassificationDimension => Boolean(dimension));

  return (
    <div className={className}>
      {shown.map(dimension => {
        const selected = value[dimension.field];
        const limitReached = mode === 'event' && Boolean(dimension.limit) && selected.length >= (dimension.limit || 0);
        const values = mode === 'filter'
          ? dimension.values.filter(item => (item.event_count ?? 1) > 0 || selected.includes(item.slug))
          : dimension.values;
        // W wyszukiwarce pole bez aktualnych wydarzeń nie ma czego filtrować.
        if (mode === 'filter' && values.length === 0) return null;
        const labelId = `classification-${mode}-${dimension.field}`;
        const fieldError = errors?.[dimension.field];
        return (
          <div key={dimension.field} className={groupClassName}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-2">
              <span id={labelId} className="text-sm font-semibold text-slate-700">
                {dimension.label}
                {mode === 'event' && dimension.required && <span className="text-red-600"> *</span>}
              </span>
              {mode === 'event' && dimension.limit && (
                <span className="text-xs text-slate-500">
                  wybrano {selected.length} z {dimension.limit}
                </span>
              )}
            </div>
            {hints?.[dimension.field] && <p className="text-sm text-slate-500 mb-3">{hints[dimension.field]}</p>}
            <div
              role="group"
              aria-labelledby={labelId}
              className={`flex flex-wrap gap-2 ${scrollable ? 'max-h-44 overflow-y-auto pr-1' : ''}`}
            >
              {values.map(item => {
                const isSelected = selected.includes(item.slug);
                // „Dla wszystkich” zastępuje wybrane grupy, więc nie blokujemy go limitem.
                const disabled = !isSelected && limitReached && !item.is_exclusive;
                return (
                  <button
                    key={item.slug}
                    type="button"
                    disabled={disabled}
                    aria-pressed={isSelected}
                    onClick={() => onChange(toggleClassificationValue(value, dimension, item.slug, mode))}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-200'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    } ${disabled ? 'opacity-40 cursor-not-allowed hover:bg-white' : ''}`}
                  >
                    {item.name}
                    {showCounts && typeof item.event_count === 'number' && (
                      <span className="ml-1 text-xs text-slate-400">{item.event_count}</span>
                    )}
                    {isSelected && <X className="w-3 h-3 ml-1 inline" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
            {fieldError && <p role="alert" className="text-sm text-red-600 mt-2">{fieldError}</p>}
          </div>
        );
      })}
    </div>
  );
}
