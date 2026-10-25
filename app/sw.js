// 探究コーヒー: オフライン用 Service Worker。
// ASSETS と VERSION は tools/build-sw.mjs が自動で書き換える（手で編集しない）。
const VERSION = '022fb99083';
const ASSETS = [
  "./",
  "./css/app.css",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/icon.svg",
  "./index.html",
  "./js/app.js",
  "./js/backup.js",
  "./js/db.js",
  "./js/importer.js",
  "./js/knowledge-data.js",
  "./js/knowledge.js",
  "./js/model.js",
  "./js/related.js",
  "./js/screens/common.js",
  "./js/screens/dict.js",
  "./js/screens/more.js",
  "./js/screens/note.js",
  "./js/ui.js",
  "./js/xlsx.js",
  "./manifest.webmanifest"
];
const CACHE = `tankyu-coffee-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('tankyu-coffee-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      return await fetch(req);
    } catch (e) {
      if (req.mode === 'navigate') {
        const shell = await cache.match('./index.html');
        if (shell) return shell;
      }
      throw e;
    }
  })());
});
