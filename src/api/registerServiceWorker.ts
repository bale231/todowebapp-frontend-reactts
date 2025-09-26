// src/utils/registerServiceWorker.ts

export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registrato:', registration);

      // Listener per messaggi dal Service Worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'VERSION_UPDATE') {
          const newVersion = event.data.version;
          handleVersionUpdate(newVersion);
        }
      });

      // Controlla versione ogni minuto
      setInterval(() => {
        registration.active?.postMessage({ type: 'CHECK_VERSION' });
      }, 60000);

      // Controlla subito all'avvio
      registration.active?.postMessage({ type: 'CHECK_VERSION' });

    } catch (error) {
      console.error('Errore registrazione Service Worker:', error);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleVersionUpdate(newVersion: any) {
  const currentVersion = localStorage.getItem('app_version') || '1.0.0';
  
  if (newVersion.version !== currentVersion) {
    console.log('🔔 Nuova versione disponibile:', newVersion);
    
    // Salva la nuova versione
    localStorage.setItem('app_version', newVersion.version);
    
    // Invia notifica al backend per creare notifica utente
    createUpdateNotification(newVersion);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createUpdateNotification(versionInfo: any) {
  const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
  
  if (!token) return;

  try {
    await fetch('https://bale231.pythonanywhere.com/api/notifications/update/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: versionInfo.version,
        type: versionInfo.type,
        message: versionInfo.message
      })
    });
    
    console.log('✅ Notifica aggiornamento creata');
  } catch (error) {
    console.error('❌ Errore creazione notifica:', error);
  }
}