'use client';

import L from 'leaflet';
import { useEffect, useRef, useCallback } from 'react';

const defaultIcon = L.icon({
  iconUrl: '/leaflet/marker-icon.png',
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  shadowUrl: '/leaflet/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LeafletMapProps {
  lat: number;
  lon: number;
  label?: string;
  height?: number;
  draggable?: boolean;
  onCoordinatesChange?: (lat: number, lon: number) => void;
}

export default function LeafletMap({ 
  lat, 
  lon, 
  label, 
  height = 280,
  draggable = false,
  onCoordinatesChange 
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const coordsRef = useRef({ lat, lon });

  const onCoordsChange = useCallback((newLat: number, newLon: number) => {
    onCoordinatesChange?.(newLat, newLon);
  }, [onCoordinatesChange]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up any existing map on this container (Strict Mode re-mount)
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(containerRef.current, {
      center: [lat, lon],
      zoom: 14,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const marker = L.marker([lat, lon], {
      icon: defaultIcon,
      draggable,
    }).addTo(map);

    if (label) {
      marker.bindPopup(label);
    }

    if (draggable) {
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        coordsRef.current = { lat: pos.lat, lon: pos.lng };
        onCoordsChange(pos.lat, pos.lng);
      });
    }

    mapRef.current = map;
    markerRef.current = marker;

    // Fix tile rendering after container is visible
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update position when props change
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    if (coordsRef.current.lat === lat && coordsRef.current.lon === lon) return;

    coordsRef.current = { lat, lon };
    mapRef.current.setView([lat, lon], 14);
    markerRef.current.setLatLng([lat, lon]);
  }, [lat, lon]);

  return (
    <div className="w-full overflow-hidden rounded-lg border">
      <div ref={containerRef} style={{ height }} className="w-full" />
      {draggable && (
        <div className="bg-blue-50 px-3 py-2 text-xs text-gray-600 border-t">
          📍 Aktualne współrzędne: {lat.toFixed(5)}, {lon.toFixed(5)}
        </div>
      )}
    </div>
  );
}
