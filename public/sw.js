// ponytail: minimal service worker — network-first (always fresh for a live health app),
// falls back to cache only when offline. Enough for install prompt + offline shell.
const CACHE = "mnt-v2";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => (k === CACHE ? null : caches.delete(k)))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // never touch POST (server actions, /api/ai)

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // let cross-origin (fonts, AI) hit the network

  // Network-first: always fetch fresh so a new deployment's HTML + hashed chunks
  // win immediately. Cache only OK responses (never poison the cache with a 404),
  // and fall back to cache only when the network is unreachable (offline).
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(request).then(
          (hit) => hit || new Response("Offline", { status: 503, statusText: "Service Unavailable" }),
        ),
      ),
  );
});
