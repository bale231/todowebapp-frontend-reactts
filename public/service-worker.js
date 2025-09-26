const CACHE_NAME = 'todo-app-v1';
const VERSION_CHECK_INTERVAL = 60000; // Controlla ogni 60 secondi

// Installa il service worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installato');
  self.skipWaiting();
});

// Attiva il service worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Attivato');
  event.waitUntil(clients.claim());
});

// Controlla aggiornamenti periodicamente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_VERSION') {
    checkForUpdates();
  }
});

async function checkForUpdates() {
  try {
    const response = await fetch('/version.json', { cache: 'no-store' });
    const newVersion = await response.json();
    
    // Invia messaggio a tutti i client
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'VERSION_UPDATE',
        version: newVersion
      });
    });
  } catch (error) {
    console.error('Errore nel controllo versione:', error);
  }
}

// Polling automatico per aggiornamenti
setInterval(() => {
  checkForUpdates();
}, VERSION_CHECK_INTERVAL);