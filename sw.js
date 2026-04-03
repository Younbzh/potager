const CACHE_NAME = 'potager-v9';
const STATIC_ASSETS = [
  './manifest.json',
  './icon.svg',
  './style.css',
];

// JS files use network-first so updates are always picked up
const JS_FILES = [
  './app.js',
  './db.js',
  './sync.js',
  './supabase-config.js',
  './moon.js',
  './plants-data.js',
  './weather.js',
  './badges.js',
  './tasks.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll([...STATIC_ASSETS, ...JS_FILES, './index.html']))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isJS = JS_FILES.some(f => url.pathname.endsWith(f.replace('./', '/')));
  const isHTML = url.pathname.endsWith('.html') || url.pathname.endsWith('/');

  if (isJS || isHTML) {
    // Network-first: always try network, fall back to cache
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
  } else {
    // Cache-first for static assets (CSS, images, fonts)
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached);
      })
    );
  }
});
