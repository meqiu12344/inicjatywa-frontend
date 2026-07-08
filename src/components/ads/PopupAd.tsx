"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { adsApi, Ad } from '@/lib/api/ads';

export default function PopupAd({ slotId = 'ad-popup-entry' }: { slotId?: string }) {
  const [ad, setAd] = useState<Ad | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const a = adsApi.getAdForSlot(slotId);
      if (!a) return;
      setAd(a);
      // always show on load (every refresh)
      setVisible(true);
    } catch (err) {
      // noop
    }
  }, [slotId]);

  const close = useCallback(() => {
    setVisible(false);
    // no persistence: show again on next refresh
  }, []);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, close]);

  if (!ad || !visible) return null;

  const imageSrc = ad.type === 'image' ? ad.imageUrl?.trim() || null : null;

  const content = (() => {
    if (ad.type === 'image' && imageSrc) {
      const img = (
        <img src={imageSrc} alt={ad.name} className="max-w-full max-h-[70vh] object-contain rounded-xl" />
      );
      return ad.linkUrl ? (
        <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer">{img}</a>
      ) : img;
    }

    if (ad.type === 'html' && ad.htmlCode) {
      return <div dangerouslySetInnerHTML={{ __html: ad.htmlCode }} />;
    }

    // Fallback: simple name
    return <div className="p-6 text-center">{ad.name}</div>;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
      <div className="relative z-10 max-w-3xl w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6">
          <button
            onClick={close}
            className="absolute -top-3 -right-3 bg-white rounded-full p-2 shadow text-gray-600 hover:text-gray-800"
            aria-label="Zamknij reklamę"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center justify-center">
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}
