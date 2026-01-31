const CACHE_NAME = 'chorequest-v2';
const RUNTIME_CACHE = 'chorequest-runtime-v2';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon.svg'
];

// URLs that should never be cached (API endpoints, dynamic data)
const CACHE_EXCLUDE_PATTERNS = [
  '/_spark/',
  '/api/',
  '/health'
];

// Check if a URL should be excluded from caching
function shouldExcludeFromCache(url) {
  const urlPath = new URL(url).pathname;
  return CACHE_EXCLUDE_PATTERNS.some(pattern => urlPath.startsWith(pattern));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Cache each resource individually to avoid failing the entire install
        return Promise.all(
          PRECACHE_URLS.map(url => 
            cache.add(url).catch(err => {
              console.warn(`Failed to cache ${url}:`, err);
              // Don't fail the whole install if one resource fails
              return Promise.resolve();
            })
          )
        );
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.warn('Service worker install encountered an error:', error);
        // Still skip waiting to allow the service worker to activate
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return cacheNames.filter((cacheName) => !currentCaches.includes(cacheName));
    }).then((cachesToDelete) => {
      return Promise.all(cachesToDelete.map((cacheToDelete) => {
        return caches.delete(cacheToDelete);
      }));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const requestUrl = event.request.url;
  
  // Don't intercept requests to external origins
  if (!requestUrl.startsWith(self.location.origin)) {
    return;
  }
  
  // Don't cache or intercept API requests - let them pass through to the network
  if (shouldExcludeFromCache(requestUrl)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return caches.open(RUNTIME_CACHE).then((cache) => {
        return fetch(event.request)
          .then((response) => {
            // Only cache successful responses for cacheable content
            if (response.status === 200 && !shouldExcludeFromCache(requestUrl)) {
              cache.put(event.request, response.clone());
            }
            return response;
          })
          .catch((error) => {
            console.warn('Fetch failed for:', requestUrl, error);
            // Return a basic offline response for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            // Re-throw the error for other types of requests
            throw error;
          });
      });
    }).catch((error) => {
      console.warn('Cache match failed:', error);
      // Fallback to network if cache fails
      return fetch(event.request);
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
