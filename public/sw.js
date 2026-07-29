/* Service worker OFManager — volontairement CONSERVATEUR (app multi-locataire
 * authentifiée). On ne met en cache QUE des ressources statiques immuables
 * (chunks Next content-hashés, icônes). Les pages HTML et les API ne sont
 * JAMAIS mises en cache (évite tout contenu périmé / fuite entre comptes) ;
 * en cas de coupure réseau sur une navigation, on sert une page hors-ligne.
 */
const VERSION = "ofm-v1";
const STATIC_CACHE = `ofm-static-${VERSION}`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll([OFFLINE_URL])),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k.startsWith("ofm-") && k !== STATIC_CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Ne cache que le statique immuable.
function isCacheableStatic(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest"
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // pas de cross-origin

  // Ne JAMAIS toucher aux API / auth / cron.
  if (url.pathname.startsWith("/api/")) return;

  // Assets statiques immuables → cache d'abord (rapide, hors-ligne).
  if (isCacheableStatic(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // Navigations (pages) → réseau d'abord ; repli page hors-ligne si coupure.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL)),
    );
    return;
  }
  // Le reste : réseau (comportement par défaut du navigateur).
});
