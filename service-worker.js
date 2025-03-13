const VERSION = 'v0.0.0'
const CACHE_NAME = 'w000t-' + VERSION;

// Update these URLs to match your actual file structure
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/w000t_192x192.png',
  '/w000t_512x512.png'
];

// Install event - cache assets with error handling
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache:', CACHE_NAME);

        // Use individual promises instead of addAll to handle individual file errors
        const cachePromises = urlsToCache.map(url => {
          // Attempt to cache each file, but don't fail if one can't be cached
          return cache.add(url).catch(error => {
            console.error(`Failed to cache ${url}:`, error);
            // Continue despite error
            return Promise.resolve();
          });
        });

        return Promise.all(cachePromises);
      })
  );

  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service worker activated');

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service worker claimed clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (event.request.url.indexOf(self.location.origin) === 0 ||
      event.request.url.includes('w000t.me')) {

    event.respondWith(
      caches.match(event.request)
        .then(response => {
          // Cache hit - return response
          if (response) {
            return response;
          }

          // Clone the request because it's a one-time use stream
          const fetchRequest = event.request.clone();

          return fetch(fetchRequest).then(response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response because it's a one-time use stream
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              })
              .catch(error => {
                console.error('Failed to cache response:', error);
              });

            return response;
          }).catch(error => {
            console.error('Fetch failed:', error);
            // You could return a custom offline page here
          });
        })
    );
  }
});
