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

  const imageSrc = ad.type === 'image' ? ad.imageUrl?.trim() || null : null;

  return (
    <div
      id={id}
      className={`ad-banner-wrapper ${className}`}
      aria-label="Reklama"
    >
      <div className="ad-banner-inner">
        <span className="ad-banner-label">Reklama</span>

        {/* ── Image ad ── */}
        {ad.type === 'image' && imageSrc && (
          <div className="ad-banner-content ad-banner-content--image">
            {ad.linkUrl ? (
              <a
                href={ad.linkUrl}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="block w-full"
              >
                <img
                  src={imageSrc}
                  alt={ad.name}
                  className="w-full object-contain"
                  style={{ display: 'block' }}
                />
              </a>
            ) : (
              <img
                src={imageSrc}
                alt={ad.name}
                className="w-full object-contain"
                style={{ display: 'block' }}
              />
            )}
          </div>
        )}

        {/* ── HTML / embed ad ── */}
        {ad.type === 'html' && (
          <div
            className="ad-banner-content"
            dangerouslySetInnerHTML={{ __html: ad.htmlCode ?? '' }}
          />
        )}

        {/* ── Google AdSense ── */}
        {ad.type === 'google_adsense' && (
          <div className="ad-banner-content" style={{ minHeight: 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="text-xs text-gray-400">Google AdSense: {ad.adsenseSlot}</span>
          </div>
        )}

      </div>
    </div>
  );
}
