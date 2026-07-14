/* Бампайте версию на КАЖДЫЙ деплой, иначе у вернувшихся пользователей
   останется старая версия страниц из кэша. */
const CACHE_NAME = 'lca-ai-v5';
const urlsToCache = [
  '/',
  '/index.html',
  '/report.html',
  '/cabinet.html',
  '/share.html',
  '/manifest.json',
  // Шрифты дизайн-системы. Раньше здесь висел Manrope — его в проекте больше нет,
  // SW тянул мёртвый файл и не кэшировал реально используемые начертания.
  'https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;700&display=swap',
  'https://cdn.jsdelivr.net/npm/jsonrepair@3.11.2/lib/umd/jsonrepair.js'
];

// Install
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate - clear old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip API calls
  if (event.request.url.includes('/api/')) return;
  
  // Skip cross-origin requests (except fonts and CDN)
  const url = new URL(event.request.url);
  const isCrossOrigin = url.origin !== self.location.origin;
  const isAllowedCDN = url.hostname.includes('googleapis.com') || 
                        url.hostname.includes('gstatic.com') || 
                        url.hostname.includes('cdn.jsdelivr.net');
  
  if (isCrossOrigin && !isAllowedCDN) return;
  
  // Check if this is an HTML request (navigation or .html file)
  const isHTML = event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/';

  if (isHTML) {
    // Network-first for HTML: try network, fall back to cache
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then(cached => cached || caches.match('/'));
        })
    );
  } else {
    // Cache-first for static assets (CSS, JS, images, fonts)
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) return response;
          return fetch(event.request).then(response => {
            if (!response || response.status !== 200) return response;
            if (response.type !== 'basic' && !isAllowedCDN) return response;
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
            return response;
          });
        })
    );
  }
});
