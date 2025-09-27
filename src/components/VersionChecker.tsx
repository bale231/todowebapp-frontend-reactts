// src/components/VersionChecker.tsx
import { useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';

export default function VersionChecker() {
  const { fetchNotifications } = useNotifications();

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const res = await fetch('/version.json?t=' + Date.now(), { 
          cache: 'no-store' 
        });
        
        if (!res.ok) return;
        
        const data = await res.json();
        const current = localStorage.getItem('app_version') || '1.0.0';
        
        if (data.version !== current) {
          localStorage.setItem('app_version', data.version);
          
          const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
          
          if (token) {
            await fetch('https://bale231.pythonanywhere.com/api/notifications/update/', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                version: data.version,
                type: data.type,
                message: data.message
              })
            });
            
            // ✅ AGGIORNA BADGE IMMEDIATAMENTE
            await fetchNotifications();
          }
        }
      } catch (err) {
        console.error('Errore check versione:', err);
      }
    };
    
    checkVersion();
    const interval = setInterval(checkVersion, 120000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  return null; // Componente invisibile
}