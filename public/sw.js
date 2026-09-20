/* Stellar service worker: Web Push for the site, an offline cache for the game.
 * Registered as /sw.js?v=<build id>; the id names the cache, so a new build
 * installs a new worker and the old caches go on activate. */

const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE = `stellar-play-${VERSION}`;
const GAME_PAGE = '/play';
/* Same-origin paths kept cache-first: the game's code and its assets. API
 * routes and everything else on the site go straight to the network. */
const CACHED_PREFIXES = ['/_next/static/', '/explore/', '/solar-system/', '/brand/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.add(new Request(GAME_PAGE, { cache: 'reload' })).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('stellar-play-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/* Hashed asset names carry their version; a query string is only the dev server's. */
const cacheFirst = (event) =>
  caches.open(CACHE).then((cache) => cache.match(event.request, { ignoreSearch: true }).then((hit) => hit || fetch(event.request).then((res) => {
    if (res.ok) cache.put(event.request, res.clone());
    return res;
  })));

/* The game page itself: the network when it is there (and the copy is
 * refreshed), the last copy when it is not. */
const pageNetworkFirst = (event) =>
  caches.open(CACHE).then((cache) => fetch(event.request).then((res) => {
    if (res.ok) cache.put(GAME_PAGE, res.clone());
    return res;
  }).catch(() => cache.match(GAME_PAGE)));

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (req.mode === 'navigate') {
    if (url.pathname === GAME_PAGE) event.respondWith(pageNetworkFirst(event));
    return;
  }
  if (CACHED_PREFIXES.some((p) => url.pathname.startsWith(p))) event.respondWith(cacheFirst(event));
});

/* The page tells the worker what it loaded before the worker was in control. */
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'cache' || !Array.isArray(data.urls)) return;
  event.waitUntil(caches.open(CACHE).then((cache) => Promise.all(
    data.urls.map((url) => cache.match(url).then((hit) => hit || cache.add(url).catch(() => undefined))),
  )));
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data && event.data.text ? event.data.text() : '' };
  }
  const title = data.title || 'Stellar';
  const options = {
    body: data.body || '',
    icon: data.icon || '/apple-touch-icon.png',
    badge: '/icon.svg',
    tag: data.tag || 'stellar',
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.navigate(url).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
