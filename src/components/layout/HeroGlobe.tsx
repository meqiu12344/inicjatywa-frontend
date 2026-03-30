'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import to prevent SSR issues with WebGL/window
const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

export default function HeroGlobe() {
  const globeEl = useRef<any>();
  const [windowWidth, setWindowWidth] = useState(600);
  const [windowHeight, setWindowHeight] = useState(600);

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

  // Dummy Catholic event points over Poland and Europe
  const locations = [
    { lat: 52.2297, lng: 21.0122, color: '#f59e0b', name: 'Warszawa - Koncert' }, 
    { lat: 50.0647, lng: 19.9450, color: '#10b981', name: 'Kraków - Modlitwa' },   
    { lat: 51.1079, lng: 17.0385, color: '#3b82f6', name: 'Wrocław - Spotkanie' },
    { lat: 54.3520, lng: 18.6466, color: '#f43f5e', name: 'Gdańsk - Warsztaty' },
    { lat: 50.8041, lng: 19.1166, color: '#eab308', name: 'Częstochowa - Pielgrzymka' },
    { lat: 41.9028, lng: 12.4964, color: '#white', name: 'Rzym - Pielgrzymka' },
    { lat: 31.7683, lng: 35.2137, color: '#eab308', name: 'Ziemia Święta' },
  ];

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
          
          htmlElementsData={locations}
          htmlElement={(d: any) => {
            const el = document.createElement('div');
            el.innerHTML = `
              <div style="display: flex; flex-direction: column; items-center; align-items: center;">
                <svg viewBox="-4 0 36 36" fill="${d.color}" width="24" height="24" style="filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.5));">
                  <path d="M14,0 C21.732,0 28,5.641 28,12.6 C28,23.963 14,36 14,36 C14,36 0,24.064 0,12.6 C0,5.641 6.268,0 14,0 Z" />
                  <circle fill="white" cx="14" cy="12" r="5" />
                </svg>
                <div style="background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-top: 2px; white-space: nowrap; border: 1px solid rgba(255,255,255,0.2);">
                  ${d.name}
                </div>
              </div>
            `;
            el.style.pointerEvents = 'none';
            return el;
          }}
        />
      )}
      </div>

      <div className="absolute bottom-4 right-4 lg:bottom-8 lg:right-8 z-20 bg-[#050B14]/70 backdrop-blur-md px-4 py-2 rounded-full text-sm font-medium text-white/90 border border-white/10 flex items-center gap-2 shadow-2xl">
        <span className="w-2.5 h-2.5 rounded-full bg-primary-400 animate-pulse"></span>
        Interaktywna Mapa (Przeciągnij, by obrócić)
      </div>
    </>
  );
}
