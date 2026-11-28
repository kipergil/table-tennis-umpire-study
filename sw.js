// Offline support. Every app file is cached on install; afterwards pages load from the cache
// and are refreshed from the network in the background (stale-while-revalidate), so updates
// arrive on the next visit. Bump VERSION when the file list changes.
const VERSION = 'tt-umpire-study-v12';
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'js/app.js',
  'js/scheduler.js',
  'js/storage.js',
  'js/diagram.js',
  'js/ui.js',
  'js/grading.js',
  'js/doubles.js',
  'js/exam.js',
  'js/trainer.js',
  'js/stats.js',
  'js/help.js',
  'js/figures.js',
  'js/install.js',
  'js/umpire.js',
  'data/manifest.json',
  'data/cards/basic.json',
  'data/cards/intermediate.json',
  'data/cards/advanced.json',
  'data/cards/exam-style.json',
  'data/cards/para.json',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrigin && !isFont) return;
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: sameOrigin });
      const network = fetch(req)
        .then((res) => { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; })
        .catch(() => null);
      if (cached) { e.waitUntil(network); return cached; }
      const res = await network;
      if (res) return res;
      // Offline and not cached: fall back to the app shell for page navigations.
      if (req.mode === 'navigate') return (await cache.match('index.html')) || Response.error();
      return Response.error();
    })
  );
});
