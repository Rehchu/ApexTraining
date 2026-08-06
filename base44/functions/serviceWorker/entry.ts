// Service Worker for PWA support
const CACHE_NAME = 'apex-coach-v2';
const urlsToCache = [
  '/',
  '/index.html'
];

// Install event - cache core files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch((err) => {
        console.warn('Service Worker: Failed to pre-cache files during install', err);
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting(); // Force activate immediately
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // Take control of all pages immediately
});

// Push event - handle web push notifications (works even when app is closed)
self.addEventListener('push', (event) => {
  let title = 'New Notification';
  let options = {
    body: 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: 'apex-notification',
    renotify: true,
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200],
    data: { url: '/' }
  };

  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      options.body = data.body || data.message || options.body;
      options.icon = data.icon || options.icon;
      options.badge = data.badge || options.badge;
      options.tag = data.tag || options.tag;
      options.data = { url: data.url || '/' };
    } catch (e) {
      try {
        options.body = event.data.text() || options.body;
      } catch (_) {}
    }
  }

  // CRITICAL: event.waitUntil keeps the service worker alive until notification is shown.
  // This is required for iOS background push to work.
  const notificationPromise = self.registration.showNotification(title, options);
  event.waitUntil(notificationPromise);
});

// Notification click event - open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlData = event.notification.data;
  const urlToOpen = (typeof urlData === 'object' && urlData?.url) ? urlData.url : (urlData || '/');
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if ('focus' in client) {
          client.focus();
          if (urlToOpen !== '/') client.navigate(urlToOpen);
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Fetch event - handle offline capabilities and updates
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip base44 API and external domains (unless specific image domains if needed)
  if (url.hostname.includes('api.base44') || url.pathname.startsWith('/api/')) {
    return;
  }

  // Navigation requests (HTML pages) - Network first, fallback to cached /index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Cache the latest version
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
            // Also update the generic /index.html fallback
            cache.put('/index.html', networkResponse.clone());
          });
          return networkResponse;
        })
        .catch(() => {
          // Network failed - Try to return cached HTML or index.html fallback
          return caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Static assets (JS, CSS, Images, Fonts) - Stale-While-Revalidate
  // Fast loading from cache, background update from network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch((error) => {
        console.warn('Network fetch failed for asset:', event.request.url, error);
      });

      return cachedResponse || fetchPromise;
    })
  );
});