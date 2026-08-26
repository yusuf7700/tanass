// Bump this on every deploy so phones pick up fresh code.
const CACHE_VERSION = 'tanass-v16';

const CORE_ASSETS = [
  '/index.html',
  '/read.html',
  '/progress.html',
  '/settings.html',
  '/css/style.css',
  '/js/app.js',
  '/js/reader.js',
  '/js/data.js',
  '/js/progress-store.js',
  '/js/texts-store.js',
  '/js/progress-page.js',
  '/js/firebase-config.js',
  '/js/auth.js',
  '/js/settings.js',
  '/js/router.js',
  '/js/install-banner.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isStaticAsset = url.pathname.startsWith('/audio/') || url.pathname.startsWith('/icons/');

  if (isStaticAsset) {
    // Cache-first: og'ir, deyarli o'zgarmaydigan fayllar — orqa fonda
    // qayta yuklamaydi (audio 2-3MB bo'lgani uchun bu muhim).
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Stale-while-revalidate: sahifa DARHOL keshdan ko'rsatiladi (tez!),
  // orqa fonda esa yangi versiya yuklab, keyingi safar uchun yangilanadi.
  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const cached = await cache.match(event.request);
      const networkFetch = fetch(event.request)
        .then((response) => {
          cache.put(event.request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
