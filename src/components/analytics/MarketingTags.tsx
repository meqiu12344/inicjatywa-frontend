'use client';

import Script from 'next/script';
import { useEffect } from 'react';
import { GA_MEASUREMENT_ID, initializeGoogleTag } from '@/lib/analytics';

/**
 * Marketing / analytics tags:
 * - Google Analytics 4 + Google Ads (one shared gtag.js)
 * - Meta (Facebook/Instagram) Pixel
 *
 * IDs sa publiczne, wiec moga byc osadzone w kliencie. Mozna je nadpisac
 * zmiennymi NEXT_PUBLIC_GA_MEASUREMENT_ID / NEXT_PUBLIC_GOOGLE_ADS_ID / NEXT_PUBLIC_META_PIXEL_ID.
 *
 * Zdarzenia konwersji (np. Purchase) wysylane sa dodatkowo po stronie serwera
 * przez Conversions API (Django) z tym samym event_id => Meta deduplikuje.
 */
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '918872627815205';

export function MarketingTags() {
  useEffect(() => { initializeGoogleTag(); }, []);

  return (
    <>
      {/* Initialize the queue before loading; onReady also covers cached scripts. */}
      <Script
        id="gtag-src"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
        onReady={initializeGoogleTag}
      />

      {/* Meta Pixel Code (Facebook / Instagram) */}
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${META_PIXEL_ID}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
