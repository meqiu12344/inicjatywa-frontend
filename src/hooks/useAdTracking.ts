'use client';

import { useEffect, useRef } from 'react';
import type { Ad } from '@/lib/api/ads';
import { apiClient } from '@/lib/api/client';
import { trackAdvertisement } from '@/lib/analytics';
import { observeAdImpression } from '@/lib/ad-visibility';

export function useAdTracking(ad: Ad | null | undefined, slotId: string, enabled = true) {
  const imageRef = useRef<HTMLImageElement>(null);
  const recordedImpression = useRef<string | null>(null);

  useEffect(() => {
    const image = imageRef.current;
    const impressionKey = `${slotId}:${ad?.id}`;
    if (!ad || !image || !enabled || recordedImpression.current === impressionKey) return;

    return observeAdImpression(image, () => {
      recordedImpression.current = impressionKey;
      trackAdvertisement('advertisement_impression', { ...ad, slotId });
      void apiClient.post(`/advertisements/public/${ad.id}/record_impression/`).catch(() => {});
    });
  }, [ad, slotId, enabled]);

  const recordClick = () => {
    if (!ad || !enabled) return;
    trackAdvertisement('advertisement_click', { ...ad, slotId });
    void apiClient.post(`/advertisements/public/${ad.id}/record_click/`).catch(() => {});
  };

  return { imageRef, recordClick };
}
