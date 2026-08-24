// Bump this on every deploy so phones pick up fresh code.
const CACHE_VERSION = 'tanass-v4';

const CORE_ASSETS = [
  '/index.html',
  '/read.html',
  '/progress.html',
  '/css/style.css',
  '/js/app.js',
  '/js/reader.js',
  '/js/data.js',
  '/js/progress-store.js',
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

// Network-first: kod doim yangi bo'lsin (HTML/CSS/JS).
// Audio/ikon kabi og'ir, kamdan-kam o'zgaruvchi fayllar uchun esa
// cache-first — birinchi ochilishdan keyin tezda yuklanadi.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isStaticAsset = url.pathname.startsWith('/audio/') || url.pathname.startsWith('/icons/');

  if (isStaticAsset) {
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

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
