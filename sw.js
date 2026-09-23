const CACHE_NAME = 'tsuri-yohou-ai-v4';
const PRECACHE = ['./index.html', './app.js', './style.css', './manifest.json', './icons/icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  if (!isSameOrigin || e.request.method !== 'GET') return; // API・CDN・外部地図タイルは常にネットワークから取得

  // アプリ本体はnetwork-first: オフライン時のみキャッシュへフォールバックする
  // (cache-firstだと更新後もSWが古いapp.js/index.htmlを配り続けてしまうため)
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request))
  );
});
