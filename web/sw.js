// Hors-ligne : réseau d'abord (pour recevoir les mises à jour), cache sinon.
const CACHE = 'wmao-3d-v5';
const FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './three.module.min.js', './js/game.js', './js/sim.js', './js/data.js', './js/audio.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
