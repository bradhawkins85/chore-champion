// Cache version will be set dynamically based on app version
let CACHE_VERSION = 'v3'; // Default fallback version
let CACHE_NAME = `chorequest-${CACHE_VERSION}`;
let RUNTIME_CACHE = `chorequest-runtime-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon.svg'
];

// Fetch version from version.json to set cache names
// Note: Version dots are replaced with dashes for valid cache names (e.g., 1.2.3 -> 1-2-3)
async function initializeCacheVersion() {
  try {
    const response = await fetch('/version.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch version.json: HTTP ${response.status}`);
    }
    const data = await response.json();
    CACHE_VERSION = data.version.replace(/\./g, '-'); // Replace dots with dashes for cache name
    CACHE_NAME = `chorequest-${CACHE_VERSION}`;
    RUNTIME_CACHE = `chorequest-runtime-${CACHE_VERSION}`;
    console.log(`Service worker initialized with cache version: ${CACHE_VERSION}`);
  } catch (error) {
    console.warn('Failed to fetch version.json, using default cache version:', error);
  }
}

// URLs that should never be cached (API endpoints, dynamic data)
const CACHE_EXCLUDE_PATTERNS = [
  '/_spark/',
  '/api/',
  '/health',
  '/version.json'
];

// Check if a URL should be excluded from caching
function shouldExcludeFromCache(url) {
  try {
    const urlPath = new URL(url).pathname;
    return CACHE_EXCLUDE_PATTERNS.some(pattern => urlPath.startsWith(pattern));
  } catch (error) {
    // If URL parsing fails, don't cache the request
    console.warn('Failed to parse URL for cache exclusion check:', url, error);
    return true;
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    initializeCacheVersion()
      .then(() => caches.open(CACHE_NAME))
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
  event.waitUntil(
    initializeCacheVersion()
      .then(() => {
        const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
        return caches.keys().then((cacheNames) => {
          return cacheNames.filter((cacheName) => !currentCaches.includes(cacheName));
        }).then((cachesToDelete) => {
          console.log(`Deleting old caches: ${cachesToDelete.join(', ')}`);
          return Promise.all(cachesToDelete.map((cacheToDelete) => {
            return caches.delete(cacheToDelete);
          }));
        });
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const requestUrl = event.request.url;
  const request = event.request;
  
  // Don't intercept requests to external origins
  if (!requestUrl.startsWith(self.location.origin)) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put('/index.html', responseClone);
          });
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }
  
  // Don't cache or intercept API requests - let them pass through to the network
  if (shouldExcludeFromCache(requestUrl)) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return caches.open(RUNTIME_CACHE).then((cache) => {
        return fetch(request)
          .then((response) => {
            // Only cache successful responses
            if (response.status === 200) {
              cache.put(request, response.clone());
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
      console.warn('Cache match failed, attempting network fallback:', requestUrl, error);
      // Fallback to network if cache fails
      return fetch(event.request).catch((networkError) => {
        console.error('Both cache and network failed for:', requestUrl, networkError);
        throw networkError;
      });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push notification event handler
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  let notificationData = {
    title: 'ChoreQuest Notification',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'chorequest-notification',
    requireInteraction: false,
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data,
      };
    } catch (e) {
      console.warn('Failed to parse push notification data:', e);
      notificationData.body = event.data.text();
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data,
    })
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  // Open or focus the app when notification is clicked
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
