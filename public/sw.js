const CACHE_PREFIX = 'generator-testu-pwa-v';
const CACHE_NAME = 'generator-testu-pwa-v7.1.4';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './manual/',
  './manual/index.html',
  './icons/icon-32.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  // Záměrně bez skipWaiting(): nová verze se aktivuje až po zavření starých karet,
  // takže učiteli nikdy sama nereloaduje rozpracovaný test.
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

async function networkFirst(request, fallbackToShell = false) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) await cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallbackToShell) {
      const shell = await cache.match('./index.html');
      if (shell) return shell;
    }
    throw err;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh && fresh.ok) await cache.put(request, fresh.clone());
  return fresh;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, true));
    return;
  }

  // Bezpečnostní komponenty AI Studia musí být online vždy čerstvé; cache je pouze
  // nouzový offline fallback. Generátor je tedy offline použitelný s posledním známým
  // permitem, po připojení se ale revokace a opravy guardu ihned projeví.
  if (url.pathname.startsWith('/AI-Studio-GHRAB/') || url.pathname.endsWith('/manifest.webmanifest')) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});
