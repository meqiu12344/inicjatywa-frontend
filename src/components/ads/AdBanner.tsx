'use client';

import { useEffect, useState } from 'react';
import { adsApi, type Ad } from '@/lib/api/ads';
import { useAdTracking } from '@/hooks/useAdTracking';

interface AdBannerProps {
  id: string;
  className?: string;
}

export default function AdBanner({ id, className = '' }: AdBannerProps) {
  const [ad, setAd] = useState<Ad | null | undefined>(undefined);
  const { imageRef, recordClick } = useAdTracking(ad, id);

  useEffect(() => {
    let cancelled = false;

    adsApi.getAdForSlot(id)
      .then((activeAd) => { if (!cancelled) setAd(activeAd); })
      .catch(() => {
        if (!cancelled) setAd(null);
      });

    return () => { cancelled = true; };
  }, [id]);

  // Loading the assigned advertisement.
  if (ad === undefined) return null;

  // No active ad assigned – show nothing (clean UX)
  if (ad === null) return null;

  const imageSrc = ad.imageUrl?.trim() || null;

  if (!imageSrc) return null;

  return (
    <div
      id={id}
      className={`ad-banner-wrapper ${className}`}
      aria-label="Reklama"
    >
      <div className="ad-banner-inner">
        <span className="ad-banner-label">Reklama</span>

        {/* ── Image ad ── */}
        <div className="ad-banner-content ad-banner-content--image">
            {ad.linkUrl ? (
              <a
                href={ad.linkUrl}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="block w-full"
                onClick={recordClick}
                onAuxClick={(event) => { if (event.button === 1) recordClick(); }}
              >
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt={ad.altText || ad.name}
                  className="w-full object-contain"
                  style={{ display: 'block' }}
                />
              </a>
            ) : (
              <img
                ref={imageRef}
                src={imageSrc}
                alt={ad.altText || ad.name}
                className="w-full object-contain"
                style={{ display: 'block' }}
              />
            )}
        </div>

      </div>
    </div>
  );
}
