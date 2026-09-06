// Chorify offline shell (§4.13): production-only, versioned caches.
// Navigation is network-first with last-cached-document fallback; hashed
// static assets and fonts are runtime-cached. Bump CACHE_VERSION on shell
// changes — clients claim immediately (skipWaiting + clientsClaim).
const CACHE_VERSION = 'chorify-v1';
const DOCUMENT_CACHE = `${CACHE_VERSION}-documents`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => !key.startsWith(CACHE_VERSION)).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(DOCUMENT_CACHE);
          cache.put(request, response.clone());
          return response;
        } catch {
          const cache = await caches.open(DOCUMENT_CACHE);
          const cached = await cache.match(request);
          return cached ?? Response.error();
        }
      })(),
    );
    return;
  }

  if (url.origin === self.location.origin && url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSET_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        cache.put(request, response.clone());
        return response;
      })(),
    );
  }
});
