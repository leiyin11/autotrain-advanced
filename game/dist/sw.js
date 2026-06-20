// Service worker: stale-while-revalidate caching so the game loads instantly and
// works offline once visited (great for an installed iPhone home-screen app).

const CACHE = 'nebula-knights-v1';

self.addEventListener('install', () => self.skipWaiting());

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
  const req = event.request;
  if (req.method !== 'GET') return;
  // Never cache websocket upgrades or cross-origin requests.
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            caches.open(CACHE).then((c) => c.put(req, res.clone()));
          }
          return res;
        })
        .catch(() => null);
      if (cached) return cached; // serve fast, revalidate in background
      const res = await network;
      if (res) return res;
      // Offline fallback to the app shell.
      return (await caches.match('./index.html')) || Response.error();
    })()
  );
});
