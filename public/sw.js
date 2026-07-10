/* Service worker dla skanera biletów (PWA).
 * Strategia:
 *  - /api/* oraz nie-GET: zawsze sieć (nigdy nie cache'ujemy odpowiedzi API).
 *  - /media/*: network-first — pliki wgrywane przez użytkownika (logo, avatary)
 *    muszą być świeże po zmianie; stale-while-revalidate pokazywało stare obrazy.
 *  - Nawigacje i statyki same-origin: stale-while-revalidate, by aplikacja
 *    (powłoka skanera) ładowała się również offline.
 */
const CACHE = 'gate-scanner-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Tylko GET tego samego origin; pomijamy API (dane biletów muszą być świeże).
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Pliki media (logo/avatary) — network-first: zawsze próbuj sieci, a cache
  // służy tylko jako fallback offline. Dzięki temu po zmianie logo widać nowe.
  if (url.pathname.startsWith('/media/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const response = await fetch(request);
          if (response && response.status === 200 && response.type === 'basic') {
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          return (await cache.match(request)) || Response.error();
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);

      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => null);

      // stale-while-revalidate: zwróć cache od razu, w tle odśwież.
      return cached || (await network) || cache.match('/bilety/moje');
    })()
  );
});
