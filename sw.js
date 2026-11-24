// Service Worker for Spotify HiFi
const CACHE_NAME = 'spotify-hifi-v4';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // CRITICAL: NEVER intercept audio streaming, API calls, or Range requests
  const url = e.request.url;
  if (
    url.includes('/api/') || 
    url.includes('stream') || 
    url.includes('googlevideo') || 
    url.includes('apple.com') || 
    url.includes('blob:') ||
    e.request.headers.has('range')
  ) {
    return; // Let browser handle natively
  }

  // Network-first for all other assets
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
