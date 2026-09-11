'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';

interface Advertisement {
  id: number;
  title: string;
  image: string | null;
  alt_text: string | null;
  click_url: string | null;
}

interface AdBannerProps {
  id: string;
  className?: string;
}

export default function AdBanner({ id, className = '' }: AdBannerProps) {
  const [ad, setAd] = useState<Advertisement | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    apiClient
      .get<Advertisement[]>(`/advertisements/public/by_placement/?placement=homepage&slot=${encodeURIComponent(id)}`)
      .then(({ data }) => {
        if (!cancelled) {
          const activeAd = data[0] ?? null;
          setAd(activeAd);
          if (activeAd) {
            apiClient.post(`/advertisements/public/${activeAd.id}/record_impression/`).catch(() => {});
          }
        }
      })
      .catch(() => {
        if (!cancelled) setAd(null);
      });

    return () => { cancelled = true; };
  }, [id]);

  // Still loading from localStorage
  if (ad === undefined) return null;

  // No active ad assigned – show nothing (clean UX)
  if (ad === null) return null;

  const imageSrc = ad.image?.trim() || null;

  if (!imageSrc) return null;

  const recordClick = () => {
    apiClient.post(`/advertisements/public/${ad.id}/record_click/`).catch(() => {});
  };

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
            {ad.click_url ? (
              <a
                href={ad.click_url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="block w-full"
                onClick={recordClick}
              >
                <img
                  src={imageSrc}
                  alt={ad.alt_text || ad.title}
                  className="w-full object-contain"
                  style={{ display: 'block' }}
                />
              </a>
            ) : (
              <img
                src={imageSrc}
                alt={ad.alt_text || ad.title}
                className="w-full object-contain"
                style={{ display: 'block' }}
              />
            )}
        </div>

      </div>
    </div>
  );
}
