'use client';

import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';

interface MapEvent {
  id: number;
  title: string;
  slug: string;
  lat: number;
  lng: number;
  city: string;
  start_date: string;
  category: string | null;
}

// Color palette per category (fallback to blue)
const CATEGORY_COLORS: Record<string, string> = {
  'Rekolekcje': '#10b981',
  'Pielgrzymki': '#eab308',
  'Spotkania modlitewne': '#8b5cf6',
  'Koncerty': '#f59e0b',
  'Warsztaty': '#3b82f6',
  'Konferencje': '#ec4899',
  'Wolontariat': '#14b8a6',
};
const DEFAULT_COLOR = '#60a5fa';

// Approximate bounding box of Poland (with a small margin).
const PL_LAT_MIN = 48.5;
const PL_LAT_MAX = 55.2;
const PL_LNG_MIN = 13.5;
const PL_LNG_MAX = 24.5;
// Bounds used to frame the map on Poland.
const PL_BOUNDS: L.LatLngBoundsExpression = [
  [49.0, 14.1],
  [54.9, 24.2],
];

function inPoland(lat: number, lng: number): boolean {
  return lat >= PL_LAT_MIN && lat <= PL_LAT_MAX && lng >= PL_LNG_MIN && lng <= PL_LNG_MAX;
}

function getColor(category: string | null): string {
  if (!category) return DEFAULT_COLOR;
  return CATEGORY_COLORS[category] ?? DEFAULT_COLOR;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Fixes markers whose latitude/longitude are stored swapped (a known data
// issue that placed e.g. Gdańsk in the sea near Toruń) and drops points that
// still fall outside Poland so no pins land in random ocean.
function normalizeToPoland(events: MapEvent[]): MapEvent[] {
  const result: MapEvent[] = [];
  for (const ev of events) {
    let { lat, lng } = ev;
    if (!inPoland(lat, lng) && inPoland(lng, lat)) {
      [lat, lng] = [lng, lat];
    }
    if (inPoland(lat, lng)) {
      result.push({ ...ev, lat, lng });
    }
  }
  return result;
}

function pinIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: 'hero-pin',
    html: `
      <svg viewBox="-4 0 36 36" fill="${color}" width="28" height="28" style="filter: drop-shadow(0 2px 6px rgba(0,0,0,0.6));">
        <path d="M14,0 C21.732,0 28,5.641 28,12.6 C28,23.963 14,36 14,36 C14,36 0,24.064 0,12.6 C0,5.641 6.268,0 14,0 Z"/>
        <circle fill="white" cx="14" cy="12" r="5"/>
      </svg>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -26],
  });
}

export default function HeroPolandMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    if (!containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(containerRef.current, {
      center: [52.0, 19.3],
      zoom: 6,
      scrollWheelZoom: false, // let the page scroll over the map
      zoomControl: false,
      attributionControl: false,
      minZoom: 6,
      maxZoom: 12,
    });

    // Keep zoom buttons on the right, clear of the hero text on the left,
    // and the attribution in the bottom-left away from the hint badge.
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.control.attribution({ position: 'bottomleft' }).addTo(map);

    // Use the public OSM layer so the map does not depend on a provider API key.
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 12,
    }).addTo(map);
    // Keep a predictable initial view centered on Poland on every screen size.
    map.setView([52.1, 19.4], 6);

    // Navigate on popup click (SPA navigation).
    map.on('popupopen', (e: L.PopupEvent) => {
      const node = e.popup.getElement();
      const link = node?.querySelector<HTMLElement>('.hero-pin-link');
      const slug = link?.getAttribute('data-slug');
      if (link && slug) {
        link.onclick = (ev) => {
          ev.preventDefault();
          routerRef.current.push(`/wydarzenia/${slug}`);
        };
      }
    });

    mapRef.current = map;

    apiClient
      .get('/events/globe/')
      .then((res) => {
        const events = normalizeToPoland(res.data as MapEvent[]);
        for (const ev of events) {
          const color = getColor(ev.category);
          const date = formatDate(ev.start_date);
          const marker = L.marker([ev.lat, ev.lng], { icon: pinIcon(color) }).addTo(map);
          const title = escapeHtml(ev.title.length > 40 ? ev.title.slice(0, 40) + '…' : ev.title);
          const city = escapeHtml(ev.city ?? '');
          marker.bindPopup(
            `<div style="min-width: 150px;">
               <div style="font-weight: 600; font-size: 13px; color: #0f172a;">${city}</div>
               <div style="font-size: 12px; color: #334155; margin-top: 2px;">${title}</div>
               ${date ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">${escapeHtml(date)}</div>` : ''}
               <a href="/wydarzenia/${escapeHtml(ev.slug)}" class="hero-pin-link" data-slug="${escapeHtml(ev.slug)}"
                  style="display: inline-block; margin-top: 6px; font-size: 12px; font-weight: 600; color: #2563eb;">
                 Zobacz szczegóły →
               </a>
             </div>`,
          );
        }
      })
      .catch(() => {
        /* Fail silently — map shows empty */
      });

    // Fix tile rendering once the container has its final size.
    const t = setTimeout(() => map.invalidateSize(), 150);

    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div ref={containerRef} className="absolute inset-0 w-full h-full z-0" />

      <div className="absolute bottom-4 right-4 lg:bottom-8 lg:right-8 z-20 bg-[#050B14]/70 backdrop-blur-md px-4 py-2 rounded-full text-sm font-medium text-white/90 border border-white/10 flex items-center gap-2 shadow-2xl pointer-events-none">
        <span className="w-2.5 h-2.5 rounded-full bg-primary-400 animate-pulse"></span>
        Mapa wydarzeń w Polsce (kliknij pineskę, by zobaczyć szczegóły)
      </div>
    </>
  );
}
