// public/sw.js - Service Worker per Push Notifications

const CACHE_NAME = 'todoapp-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Install event
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event (cache strategy)
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});

// Push event - Gestisce push notifications
self.addEventListener('push', (event) => {
  console.log('🔔 Push notification received:', event);

  const options = {
    body: 'Nuovi aggiornamenti disponibili!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1',
      url: '/'
    },
    actions: [
      {
        action: 'explore', 
        title: 'Apri App',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close', 
        title: 'Chiudi',
        icon: '/icons/xmark.png'
      }
    ],
    requireInteraction: false,
    silent: false,
    renotify: false,
    tag: 'app-update' // Evita duplicati
  };

  let title = '🚀 ToDoApp Aggiornata!';
  let notificationOptions = { ...options };

  if (event.data) {
    try {
      const payload = event.data.json();
      title = payload.title || title;
      notificationOptions = {
        ...notificationOptions,
        body: payload.body || notificationOptions.body,
        icon: payload.icon || notificationOptions.icon,
        data: {
          ...notificationOptions.data,
          ...payload.data
        }
      };
    } catch (e) {
      console.log('Error parsing push payload:', e);
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, notificationOptions)
      .then(() => {
        console.log('✅ Notification shown successfully');
        
        // Informa i client aperti della nuova notifica
        self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'PUSH_RECEIVED',
              notification: { title, ...notificationOptions }
            });
          });
        });
      })
      .catch(error => {
        console.error('❌ Error showing notification:', error);
      })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Notification click received:', event);

  event.notification.close();

  if (event.action === 'close') {
    // User clicked close, do nothing
    return;
  }

  // Default action or 'explore' action
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('❌ Notification was closed:', event);
  
  // Analytics tracking (opzionale)
  // trackEvent('notification_closed', event.notification.tag);
});

// Background sync (opzionale, per quando l'app è offline)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('🔄 Background sync triggered');
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Sync offline data, check for updates, etc.
    const response = await fetch('/api/notifications/stats/');
    if (response.ok) {
      const data = await response.json();
      
      // Informa i client del nuovo stato
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'SYNC_COMPLETE',
          data: data
        });
      });
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Message event - Comunicazione con l'app
self.addEventListener('message', (event) => {
  console.log('💬 SW received message:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      type: 'VERSION',
      version: '1.0.0' // Versione del SW
    });
  }
});

// Error handling
self.addEventListener('error', (event) => {
  console.error('🚨 Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled promise rejection in SW:', event.reason);
});

// Utility functions
function getBadgeCount() {
  // Implementa logica per contare notifiche non lette
  return 0;
}

function updateBadge(count) {
  if ('setAppBadge' in navigator) {
    navigator.setAppBadge(count);
  }
}

// Periodic background sync (experimental)
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'content-sync') {
      event.waitUntil(doBackgroundSync());
    }
  });
}