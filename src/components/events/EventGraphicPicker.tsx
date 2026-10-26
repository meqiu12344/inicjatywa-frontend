'use client';

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { CircleCheck, ImageUp, LayoutTemplate, Loader2, Upload, X } from 'lucide-react';
import { eventsApi, type IkCardPreviewData } from '@/lib/api/events';
import type { GraphicType } from '@/types';

export const DEFAULT_IK_CARD_VARIANT = 'IK-01';

interface EventGraphicPickerProps {
  graphicType: GraphicType;
  onGraphicTypeChange: (value: GraphicType) => void;
  variant: string;
  onVariantChange: (value: string) => void;
  // Dane wydarzenia, z których portal składa Kartę IK (bez wariantu).
  cardData: Omit<IkCardPreviewData, 'ik_card_variant'>;
  // Wybrany plik plakatu albo zapisany plakat wydarzenia.
  posterSrc: string | null;
  onPosterChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPosterRemove: () => void;
  posterFooter?: ReactNode;
  error?: string;
}

const OPTIONS: { value: GraphicType; title: string; text: string; icon: typeof LayoutTemplate }[] = [
  {
    value: 'ik_card',
    title: 'Gotowa Karta IK',
    text: 'Stały układ InicjatywaKatolicka.pl. Kategoria, tytuł, termin, miejsce i Organizator uzupełnią się same.',
    icon: LayoutTemplate,
  },
  {
    value: 'poster',
    title: 'Własny plakat',
    text: 'Oficjalny plakat Organizatora — prześlij plik JPG, PNG lub WEBP (maks. 5 MB).',
    icon: ImageUp,
  },
];

/** Grafika wydarzenia: wybór gotowej Karty IK (wariant po ID) albo własnego plakatu Organizatora. */
export function EventGraphicPicker({
  graphicType, onGraphicTypeChange, variant, onVariantChange, cardData,
  posterSrc, onPosterChange, onPosterRemove, posterFooter, error,
}: EventGraphicPickerProps) {
  const { data: library } = useQuery({
    queryKey: ['ik-cards'],
    queryFn: eventsApi.getIkCards,
    staleTime: Infinity,
  });

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="Grafika wydarzenia" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {OPTIONS.map(({ value, title, text, icon: Icon }) => {
          const checked = graphicType === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => onGraphicTypeChange(value)}
              className={clsx(
                'relative text-left rounded-xl border-2 p-4 transition-colors',
                checked ? 'border-primary-600 bg-primary-50' : 'border-slate-200 bg-white hover:border-slate-300',
              )}
            >
              {checked && <CircleCheck className="absolute top-3 right-3 w-5 h-5 text-primary-600" />}
              <Icon className={clsx('w-6 h-6 mb-2', checked ? 'text-primary-600' : 'text-slate-400')} />
              <span className="block font-semibold text-slate-900">{title}</span>
              <span className="block text-sm text-slate-600 mt-1 pr-4">{text}</span>
            </button>
          );
        })}
      </div>

      {graphicType === 'ik_card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-5 items-start rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div>
            <span className="block text-sm font-semibold text-slate-700 mb-2">Wariant karty</span>
            <div className="flex flex-wrap gap-2">
              {(library?.variants ?? []).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={variant === item.id}
                  onClick={() => onVariantChange(item.id)}
                  className={clsx(
                    'flex items-center gap-2 rounded-lg border-2 bg-white px-3 py-2 text-sm transition-colors',
                    variant === item.id ? 'border-primary-600' : 'border-slate-200 hover:border-slate-300',
                  )}
                >
                  <span
                    className="w-6 h-8 rounded-sm border"
                    style={{ background: `linear-gradient(${item.band} 0 22%, ${item.accent} 22% 27%, ${item.background} 27%)` }}
                  />
                  <span className="text-left leading-tight">
                    <span className="block font-semibold text-slate-900">{item.id}</span>
                    <span className="block text-xs text-slate-500">{item.name}</span>
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Karta IK jest grafiką portalu, a nie plakatem Organizatora — tak też jest podpisana na stronie
              wydarzenia. Po zmianie danych wydarzenia karta odświeży się sama.
            </p>
          </div>
          <IkCardPreview data={{ ...cardData, ik_card_variant: variant }} />
        </div>
      ) : (
        <div>
          {posterSrc ? (
            <div className="relative inline-block max-w-full">
              <img src={posterSrc} alt="Podgląd plakatu" className="max-h-80 max-w-full rounded-lg border border-slate-200" />
              <button
                type="button"
                onClick={onPosterRemove}
                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"
                title="Usuń plakat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-primary-500 hover:bg-primary-50/30 transition-all">
              <Upload className="w-10 h-10 text-slate-400 mb-3" />
              <p className="mb-1 text-sm text-slate-500">
                <span className="font-semibold">Kliknij, aby przesłać plakat</span>
              </p>
              <p className="text-xs text-slate-500">PNG, JPG, WEBP (maks. 5 MB)</p>
              <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={onPosterChange} />
            </label>
          )}
          {posterFooter}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

/** Podgląd z backendu — ten sam renderer, który zapisze kartę w wydarzeniu. */
export function IkCardPreview({ data }: { data: IkCardPreviewData }) {
  const key = JSON.stringify(data);
  const [src, setSrc] = useState<string | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const url = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    const timer = setTimeout(async () => {
      try {
        const blob = await eventsApi.previewIkCard(JSON.parse(key));
        if (cancelled) return;
        if (url.current) URL.revokeObjectURL(url.current);
        url.current = URL.createObjectURL(blob);
        setSrc(url.current);
        setState('ready');
      } catch {
        if (!cancelled) setState('error');
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key]);

  useEffect(() => () => {
    if (url.current) URL.revokeObjectURL(url.current);
  }, []);

  return (
    <figure className="relative w-full max-w-[200px] mx-auto">
      <div className="relative aspect-[1000/1414] rounded-lg overflow-hidden border border-slate-200 bg-white shadow-sm">
        {src && <img src={src} alt="Podgląd Karty IK" className="w-full h-full object-cover" />}
        {state === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
            <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
          </div>
        )}
      </div>
      <figcaption className="text-xs text-slate-500 mt-2 text-center">
        {state === 'error' ? 'Podgląd niedostępny. Przy zapisie portal ponownie spróbuje przygotować kartę.' : 'Podgląd karty'}
      </figcaption>
    </figure>
  );
}
