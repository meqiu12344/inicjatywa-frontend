export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-Y2T7MLDZX1';
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || 'AW-17728216196';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    ikGoogleTagInitialized?: boolean;
  }
}

/** Share one Google tag and queue, including when events precede script loading. */
export function initializeGoogleTag(): void {
  if (typeof window === 'undefined' || window.ikGoogleTagInitialized) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer!.push(arguments); };
  window.ikGoogleTagInitialized = true;
  window.gtag('js', new Date());
  window.gtag('config', GOOGLE_ADS_ID);
  // GA4 Enhanced Measurement owns page views, including Next.js history changes.
  // Do not also send manual page_view events (see README for stream settings).
  window.gtag('config', GA_MEASUREMENT_ID);
}

export interface AdvertisementAnalytics {
  id: string;
  slotId: string;
  campaignId?: string;
  advertiserId?: string;
}

export function trackAdvertisement(
  event: 'advertisement_impression' | 'advertisement_click',
  ad: AdvertisementAnalytics,
): void {
  if (typeof window === 'undefined') return;
  initializeGoogleTag();
  window.gtag?.('event', event, {
    send_to: GA_MEASUREMENT_ID,
    transport_type: 'beacon',
    ad_id: ad.id,
    ad_slot: ad.slotId,
    ...(ad.campaignId ? { ad_campaign_id: ad.campaignId } : {}),
    ...(ad.advertiserId ? { ad_advertiser_id: ad.advertiserId } : {}),
  });
}
