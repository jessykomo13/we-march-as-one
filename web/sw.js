// Hors-ligne : on demande TOUJOURS la dernière version au serveur (sans cache HTTP),
// et on ne sert la copie locale que si on est hors ligne.
const VERSION = '8';
const CACHE = 'wmao-' + VERSION;
const FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './three.module.min.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(req, { cache: 'no-store' })
      .then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(req, c)); } return r; })
      .catch(() => caches.match(req, { ignoreSearch: true }))
  );
});
