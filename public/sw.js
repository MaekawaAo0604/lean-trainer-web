// Service Worker for Lean Trainer Web
const CACHE_NAME = "lean-trainer-cache-v2";
const ESSENTIAL_URLS = [
  "/",
  "/index.html",
  "/beep.mp3"
];

// Install event - cache essential files only
self.addEventListener("install", (event) => {
  console.log("SW: Installing...");
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log("SW: Caching essential files");
        return Promise.allSettled(
          ESSENTIAL_URLS.map(url => 
            cache.add(url).catch(err => {
              console.warn(`SW: Failed to cache ${url}:`, err);
              return null;
            })
          )
        );
      })
      .then(() => {
        console.log("SW: Installation complete");
        return self.skipWaiting();
      })
      .catch(err => {
        console.error("SW: Installation failed:", err);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("SW: Activating...");
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("SW: Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("SW: Activation complete");
        return self.clients.claim();
      })
  );
});

// Fetch event - network first strategy
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If fetch succeeds, cache the response for future use
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone);
            })
            .catch(err => {
              console.warn("SW: Cache put failed:", err);
            });
        }
        return response;
      })
      .catch(() => {
        // If fetch fails, try to serve from cache
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              console.log("SW: Serving from cache:", event.request.url);
              return cachedResponse;
            }
            // If not in cache either, return a basic response for HTML requests
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
            return new Response('Resource not available offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});
