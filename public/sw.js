const CACHE_NAME = "letzshopy-vendor-v1";
const APP_SHELL = [
  "/dashboard",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          const copy = response.clone();

          if (
            response.ok &&
            (request.destination === "document" ||
              request.destination === "script" ||
              request.destination === "style" ||
              request.destination === "image" ||
              request.destination === "font")
          ) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }

          return response;
        })
        .catch(() => {
          if (request.mode === "navigate") {
            return caches.match("/dashboard");
          }
          throw new Error("Network error");
        });
    })
  );
});