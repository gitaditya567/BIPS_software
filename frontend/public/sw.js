/* ==========================================================================
   BIPS School ERP - Progressive Web App Service Worker
   Version: 1.0.0
   Scope: /erp/
   ========================================================================== */

const CACHE_VERSION = 'bips-erp-v1.0.0';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Core assets required for offline app shell
const PRECACHE_ASSETS = [
  '/erp/',
  '/erp/index.html',
  '/erp/offline.html',
  '/erp/manifest.webmanifest',
  '/erp/manifest.json',
  '/erp/bips-logo.png',
  '/erp/icons/icon-192x192.png',
  '/erp/icons/icon-512x512.png',
  '/erp/icons/icon-180x180.png',
  '/erp/icons/icon-maskable-192x192.png',
  '/erp/icons/badge-72x72.png'
];

// Max items in API cache to prevent storage bloat
const MAX_API_ENTRIES = 50;

/**
 * Trim cache to max items
 */
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      await cache.delete(keys[0]);
      await trimCache(cacheName, maxItems);
    }
  } catch (err) {
    console.warn('[SW] Cache trim error:', err);
  }
}

// ─── 1. INSTALL EVENT ────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker version:', CACHE_VERSION);
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => {
        console.log('[SW] Pre-caching App Shell assets');
        return cache.addAll(PRECACHE_ASSETS.map(url => new Request(url, { cache: 'reload' })));
      })
      .then(() => {
        // Activate worker immediately without waiting for old tabs to close
        return self.skipWaiting();
      })
      .catch((err) => {
        console.warn('[SW] Pre-cache warning (some assets may be fetched on demand):', err);
      })
  );
});

// ─── 2. ACTIVATE EVENT ───────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker version:', CACHE_VERSION);
  const expectedCaches = [SHELL_CACHE, STATIC_CACHE, API_CACHE];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!expectedCaches.includes(cacheName)) {
            console.log('[SW] Deleting obsolete cache:', cacheName);
            return caches.delete(cacheName);
          }
          return null;
        })
      );
    }).then(() => {
      // Claim all open clients immediately
      return self.clients.claim();
    })
  );
});

// ─── 3. FETCH EVENT ──────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-HTTP/HTTPS requests (e.g. chrome-extension://, data:)
  if (!url.protocol.startsWith('http')) return;

  // 1) Non-GET requests (POST, PUT, DELETE, etc.)
  if (request.method !== 'GET') {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({
            offline: true,
            success: false,
            message: 'You are currently offline. This action cannot be completed until your connection is restored.'
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }

  // 2) Navigation requests (HTML pages) -> Network-First with Cache fallback & Offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If valid response, clone into shell cache
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(async () => {
          // Try to return cached version of this page
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;

          // Try index.html for SPA client-side routes
          const cachedIndex = await caches.match('/erp/index.html');
          if (cachedIndex) return cachedIndex;

          // Return dedicated offline fallback page
          const cachedOffline = await caches.match('/erp/offline.html');
          if (cachedOffline) return cachedOffline;

          return new Response('<h1>Offline</h1><p>Please check your internet connection.</p>', {
            headers: { 'Content-Type': 'text/html' }
          });
        })
    );
    return;
  }

  // 3) API requests (/erp-api/ or /api/) -> Network-First with Cache fallback
  if (url.pathname.startsWith('/erp-api/') || url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(API_CACHE).then((cache) => {
              cache.put(request, responseClone);
              trimCache(API_CACHE, MAX_API_ENTRIES);
            });
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            console.log('[SW] Serving cached API response for:', request.url);
            return cachedResponse;
          }

          return new Response(
            JSON.stringify({
              offline: true,
              data: null,
              message: 'Cached data unavailable offline.'
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // 4) Static assets (JS, CSS, Images, Fonts, Icons) -> Stale-While-Revalidate / Cache-First
  const isStaticAsset = (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|webp|gif|woff|woff2|ttf|eot|ico)$/i) ||
    url.pathname.startsWith('/erp/assets/') ||
    url.pathname.startsWith('/erp/icons/')
  );

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, responseClone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse); // fallback to cached if network fails

        // Return cached immediately if available, else wait for network
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 5) Default fallback -> Cache first then network
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      return cachedResponse || fetch(request).catch(() => null);
    })
  );
});

// ─── 4. MESSAGES FROM CLIENTS ────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    console.log('[SW] SKIP_WAITING received, activating new service worker');
    self.skipWaiting();
  }

  if (event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }

  if (event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => {
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ success: true });
      }
    });
  }
});

// ─── 5. PUSH NOTIFICATIONS ───────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'BIPS School ERP';
    const options = {
      body: data.body || 'You have a new update from BIPS ERP.',
      icon: '/erp/icons/icon-192x192.png',
      badge: '/erp/icons/badge-72x72.png',
      data: {
        url: data.url || '/erp/'
      },
      vibrate: [100, 50, 100],
      tag: data.tag || 'bips-erp-notification',
      renotify: true
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('[SW] Push notification error:', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/erp/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/erp/') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return null;
    })
  );
});
