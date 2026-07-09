// ponytail: minimal service worker — network-first (always fresh for a live health app),
// falls back to cache only when offline. Enough for install prompt + offline shell.
const CACHE = "mnt-v1";

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

  // Stale-while-revalidate: serve cache instantly, refresh it in the background.
  // Feels native-fast; content is at most one load behind and self-updates.
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(request).then((hit) => {
        const fresh = fetch(request)
          .then((res) => {
            cache.put(request, res.clone()).catch(() => {});
            return res;
          })
          .catch(() => hit); // offline: fall back to whatever we have
        return hit || fresh; // cached copy now, network only if nothing cached
      }),
    ),
  );
});
