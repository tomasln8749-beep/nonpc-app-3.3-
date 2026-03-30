const CACHE_NAME = "nonpc-cache-v3";
const APP_SHELL = [
  "./",
  "./index.html",
  "./login/",
  "./login/index.html",
  "./login/login.js",
  "./setup-username/",
  "./setup-username/index.html",
  "./setup-username/setup-username.js",
  "./missions/",
  "./missions/index.html",
  "./missions/missions.js",
  "./community/",
  "./community/index.html",
  "./community/community.js",
  "./challenges/",
  "./challenges/index.html",
  "./challenges/challenges.js",
  "./feed/",
  "./feed/index.html",
  "./feed/feed.js",
  "./ranking/",
  "./ranking/index.html",
  "./ranking/ranking.js",
  "./profile/",
  "./profile/index.html",
  "./profile/profile.js",
  "./js/firebase-config.js",
  "./js/firebase-client.js",
  "./js/auth.js",
  "./js/data.js",
  "./js/shell.js",
  "./styles.css",
  "./script.js",
  "./manifest.json",
  "./icons/icon-192.svg",
  "./icons/icon-512.svg"
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
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });

          return networkResponse;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
