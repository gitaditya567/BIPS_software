// Service Worker Registration for BIPS School ERP

type Config = {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
};

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(
    /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
  )
);

export function register(config?: Config) {
  if ('serviceWorker' in navigator) {
    // Only register on window load to not slow down initial render
    window.addEventListener('load', () => {
      const swUrl = '/erp/sw.js';

      if (isLocalhost) {
        // Check if a service worker still exists or not on localhost
        checkValidServiceWorker(swUrl, config);
        navigator.serviceWorker.ready.then(() => {
          console.log('[PWA] Service Worker running on localhost with /erp/ scope');
        });
      } else {
        // Register production service worker
        registerValidSW(swUrl, config);
      }
    });

    // Listen for online / offline events
    window.addEventListener('online', () => {
      window.dispatchEvent(new CustomEvent('pwa-online'));
    });
    window.addEventListener('offline', () => {
      window.dispatchEvent(new CustomEvent('pwa-offline'));
    });
  }
}

function registerValidSW(swUrl: string, config?: Config) {
  navigator.serviceWorker
    .register(swUrl, { scope: '/erp/' })
    .then((registration) => {
      // Check for updates periodically (every 60 minutes)
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) return;

        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New content is available and will be used when all tabs are closed or updated
              console.log('[PWA] New content is available; please refresh.');
              window.dispatchEvent(new CustomEvent('pwa-update-available', { detail: registration }));
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              // Content is cached for offline use
              console.log('[PWA] Content is cached for offline use.');
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('[PWA] Error during service worker registration:', error);
    });
}

function checkValidServiceWorker(swUrl: string, config?: Config) {
  // Check if the service worker can be found. If it can't reload the page.
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      // Ensure service worker exists, and that we really are getting a JS file.
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // No service worker found. Probably a different app. Reload the page.
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        // Service worker found. Proceed as normal.
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log('[PWA] No internet connection found. App is running in offline mode.');
    });
}

/**
 * Trigger update immediately and reload
 */
export function skipWaitingAndReload() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration('/erp/').then((registration) => {
      if (registration && registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      window.location.reload();
    });
  } else {
    window.location.reload();
  }
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}
