const CACHE_NAME = 'spotify-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/favicon.ico',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Only intercept HTTP/GET requests
  if (event.request.method !== 'GET') return;

  // Bypass internal Next.js static assets and hot module updates (HMR) to prevent dev refresh loops
  if (
    event.request.url.includes('/_next/') ||
    event.request.url.includes('hmr') ||
    event.request.url.includes('webpack')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        // Return cached index page as fallback for navigation requests offline
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
        return new Response('Network error occurred', { status: 480, statusText: 'Offline' });
      });
    })
  );
});
