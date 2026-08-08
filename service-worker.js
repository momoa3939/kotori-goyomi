// ことりごよみ - Service Worker
// オフラインでも開けるように、アプリ本体を端末にキャッシュします。
// データそのもの（記録）はlocalStorageに保存されるので、
// ここでは「アプリの見た目や動き」だけをキャッシュしています。
const CACHE_NAME = 'kotori-goyomi-v3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './icon-192-maskable.png'
];
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isNavigation = event.request.mode === 'navigate';
  // app.js・style.cssなど「アプリの中身そのもの」はネット優先にして、
  // 更新したらすぐ反映されるようにする
  const isCoreAsset = /\.(js|css)$/.test(url.pathname);

  if (isNavigation) {
    // ページ本体はネット優先→失敗したらキャッシュ（更新を反映しやすくするため）
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  if (isCoreAsset) {
    // app.js・style.cssもネット優先→失敗したらキャッシュ
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // アイコンなど、めったに変わらないものはキャッシュ優先のまま
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        return res;
      });
    })
  );
});
