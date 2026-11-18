/* スライム増殖クリッカー Service Worker
   ゲーム本体（HTML・マニフェスト・アイコン）をキャッシュして、
   オフラインでも起動できるようにする。 */
var CACHE_NAME = "slime-clicker-v1";
var CORE_ASSETS = [
  "../index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(CORE_ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE_NAME) return caches.delete(key);
        return null;
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;

  /* ページ本体はネットワーク優先（更新を取りこぼさない）、
     失敗したらキャッシュでオフライン起動。 */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then(function (response) {
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put("../index.html", copy);
        });
        return response;
      }).catch(function () {
        return caches.match("../index.html", { ignoreSearch: true });
      })
    );
    return;
  }

  /* 静的アセットはキャッシュ優先で高速表示、裏で更新。 */
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(function (cached) {
      var network = fetch(request).then(function (response) {
        if (response && response.ok) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, copy);
          });
        }
        return response;
      }).catch(function () {
        return cached;
      });
      return cached || network;
    })
  );
});
