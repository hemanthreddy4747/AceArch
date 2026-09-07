/* AceArch PWA service worker.
 *
 * Security rule: authenticated/private API traffic is NEVER cached.
 * The service worker only caches the public application shell and static assets.
 */
const CACHE_NAME = "acearch-shell-v2";
const APP_SHELL = [
    "/",
    "/index.html",
    "/css/style.css",
    "/js/app.js",
    "/manifest.json",
    "/icons/icon-192.png",
    "/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys
                .filter((key) => key !== CACHE_NAME)
                .map((key) => caches.delete(key))
        ))
    );
    self.clients.claim();
});

function isPrivateApiRequest(request) {
    const url = new URL(request.url);
    return url.origin === self.location.origin &&
        (url.pathname === "/api" || url.pathname.startsWith("/api/"));
}

function isStaticAssetRequest(request) {
    const url = new URL(request.url);
    return url.origin === self.location.origin &&
        ["style", "script", "font", "image", "manifest"].includes(request.destination);
}

self.addEventListener("fetch", (event) => {
    const { request } = event;

    if (request.method !== "GET" || isPrivateApiRequest(request)) {
        // POST/DELETE/etc. and every /api/* request go directly to the network.
        // In particular, Bearer-token responses are never placed in Cache Storage.
        return;
    }

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) {
        return;
    }

    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request, { cache: "no-store" })
                .then((response) => response)
                .catch(() => caches.match("/index.html"))
        );
        return;
    }

    if (isStaticAssetRequest(request)) {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached) return cached;
                return fetch(request).then((response) => {
                    if (response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    }
                    return response;
                });
            })
        );
    }
});
