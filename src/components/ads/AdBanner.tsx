'use client';

import { useEffect, useState } from 'react';
import { adsApi, Ad } from '@/lib/api/ads';

interface AdBannerProps {
  id: string;
  className?: string;
}

export default function AdBanner({ id, className = '' }: AdBannerProps) {
  const [ad, setAd] = useState<Ad | null | undefined>(undefined); // undefined = loading

  useEffect(() => {
    setAd(adsApi.getAdForSlot(id));
  }, [id]);

  // Still loading from localStorage
  if (ad === undefined) return null;

  // No active ad assigned – show nothing (clean UX)
  if (ad === null) return null;

  return (
    <div
      id={id}
      className={`ad-banner-wrapper ${className}`}
      aria-label="Reklama"
    >
      <div className="ad-banner-inner">
        <span className="ad-banner-label">Reklama</span>
        <div className="ad-banner-content">

          {/* ── Image ad ── */}
          {ad.type === 'image' && (
            ad.linkUrl ? (
              <a
                href={ad.linkUrl}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="block w-full h-full"
              >
                <img
                  src={ad.imageUrl}
                  alt={ad.name}
                  className="w-full h-full object-cover"
                />
              </a>
            ) : (
              <img
                src={ad.imageUrl}
                alt={ad.name}
                className="w-full h-full object-cover"
              />
            )
          )}

          {/* ── HTML / embed ad ── */}
          {ad.type === 'html' && (
            <div
              className="w-full h-full flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: ad.htmlCode ?? '' }}
            />
          )}

          {/* ── Google AdSense (placeholder – requires script) ── */}
          {ad.type === 'google_adsense' && (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-xs">
              Google AdSense: {ad.adsenseSlot}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
