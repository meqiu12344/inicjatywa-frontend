'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { apiClient } from '@/lib/api/client';

// Dynamic import to prevent SSR issues with WebGL/window
const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

interface GlobeEvent {
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

// Spread out markers at the same location so they don't overlap
function spreadOverlapping(events: GlobeEvent[]): GlobeEvent[] {
  const groups = new Map<string, GlobeEvent[]>();
  for (const ev of events) {
    const key = `${ev.lat.toFixed(1)}_${ev.lng.toFixed(1)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(ev);
  }
  const result: GlobeEvent[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      result.push(group[0]);
    } else {
      const offset = 0.8 + group.length * 0.15;
      group.forEach((ev, i) => {
        const angle = (2 * Math.PI * i) / group.length - Math.PI / 2;
        result.push({
          ...ev,
          lat: ev.lat + offset * Math.cos(angle),
          lng: ev.lng + offset * Math.sin(angle),
        });
      });
    }
  }
  return result;
}

export default function HeroGlobe() {
  const globeEl = useRef<any>();
  const router = useRouter();
  const [windowWidth, setWindowWidth] = useState(600);
  const [windowHeight, setWindowHeight] = useState(600);
  const [events, setEvents] = useState<GlobeEvent[]>([]);

  // Fetch events for globe
  useEffect(() => {
    apiClient.get('/events/globe/')
      .then((res) => setEvents(spreadOverlapping(res.data)))
      .catch(() => {/* Fail silently — globe shows empty */});
  }, []);

  useEffect(() => {
    // Configure rotation auto-spin and initial position
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.5;
      globeEl.current.controls().enableZoom = true;
      // Start centered on Poland
      globeEl.current.pointOfView({ lat: 52, lng: 19, altitude: 1.2 }, 1000);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const parent = document.getElementById('globe-container');
      if (parent) {
        setWindowWidth(parent.clientWidth);
        setWindowHeight(parent.clientHeight || 600);
      }
    };
    
    // Initial resize trigger after short delay to ensure DOM is ready
    setTimeout(handleResize, 100);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const createHtmlElement = useCallback((d: object) => {
    const ev = d as GlobeEvent;
    const color = getColor(ev.category);
    const date = formatDate(ev.start_date);

    const el = document.createElement('div');
    el.style.cursor = 'pointer';
    el.style.pointerEvents = 'auto';
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (ev.slug) router.push(`/wydarzenia/${ev.slug}`);
    });
    el.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; transition: transform 0.2s; position: relative;" 
           onmouseover="this.style.transform='scale(1.25)'; this.querySelector('.globe-tooltip').style.opacity='1'; this.querySelector('.globe-tooltip').style.pointerEvents='auto';" 
           onmouseout="this.style.transform='scale(1)'; this.querySelector('.globe-tooltip').style.opacity='0'; this.querySelector('.globe-tooltip').style.pointerEvents='none';">
        <svg viewBox="-4 0 36 36" fill="${color}" width="26" height="26" style="filter: drop-shadow(0 2px 6px rgba(0,0,0,0.6));">
          <path d="M14,0 C21.732,0 28,5.641 28,12.6 C28,23.963 14,36 14,36 C14,36 0,24.064 0,12.6 C0,5.641 6.268,0 14,0 Z"/>
          <circle fill="white" cx="14" cy="12" r="5"/>
        </svg>
        <div class="globe-tooltip" style="opacity: 0; pointer-events: none; transition: opacity 0.2s; background: rgba(0,0,0,0.8); backdrop-filter: blur(6px); color: white; padding: 4px 10px; border-radius: 6px; font-size: 11px; margin-top: 3px; white-space: nowrap; border: 1px solid rgba(255,255,255,0.15); line-height: 1.3; position: absolute; top: 100%; z-index: 10;">
          <div style="font-weight: 600;">${ev.city}</div>
          <div style="opacity: 0.8; font-size: 10px;">${ev.title.length > 28 ? ev.title.slice(0, 28) + '…' : ev.title}</div>
          ${date ? `<div style="opacity: 0.6; font-size: 9px;">${date}</div>` : ''}
        </div>
      </div>
    `;
    return el;
  }, [router]);

  return (
    <>
      <div id="globe-container" className="absolute inset-0 w-full h-full flex items-center justify-center cursor-move z-0 transition-opacity duration-1000 translate-x-[10%] lg:translate-x-[25%] scale-110">
        
        {typeof window !== 'undefined' && (
          <Globe
            ref={globeEl}
          width={windowWidth}
          height={windowHeight}
          // High-quality satellite maps
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          backgroundColor="rgba(0,0,0,0)" // Transparent background
          showAtmosphere={true}
          atmosphereColor="#60a5fa"
          atmosphereAltitude={0.15}
          
          htmlElementsData={events}
          htmlLat="lat"
          htmlLng="lng"
          htmlElement={createHtmlElement}
        />
      )}
      </div>

      <div className="absolute bottom-4 right-4 lg:bottom-8 lg:right-8 z-20 bg-[#050B14]/70 backdrop-blur-md px-4 py-2 rounded-full text-sm font-medium text-white/90 border border-white/10 flex items-center gap-2 shadow-2xl">
        <span className="w-2.5 h-2.5 rounded-full bg-primary-400 animate-pulse"></span>
        Interaktywna Mapa (Kliknij wydarzenie, by zobaczyć szczegóły)
      </div>
    </>
  );
}
