import { useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';

export default function VersionChecker() {
  const { fetchNotifications } = useNotifications();

  console.log('🔍 VersionChecker montato');

  useEffect(() => {
    console.log('🔍 useEffect partito');
    
    const checkVersion = async () => {
      console.log('🔍 Inizio controllo versione...');
      
      try {
        const res = await fetch('./version.json?t=' + Date.now(), { 
          cache: 'no-store' 
        });
        
        console.log('📦 Risposta version.json:', res.status);
        
        if (!res.ok) return;
        
        const data = await res.json();
        console.log('📦 Dati version.json:', data);
        
        const current = localStorage.getItem('app_version') || '1.0.0';
        console.log('📌 Versione corrente:', current);
        console.log('📌 Nuova versione:', data.version);
        
        if (data.version !== current) {
          console.log('✨ Versioni diverse! Creo notifica...');
          
          localStorage.setItem('app_version', data.version);
          
          const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
          
          if (token) {
            const response = await fetch('https://bale231.pythonanywhere.com/api/notifications/update/', {
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
            
            console.log('📬 Risposta notifica:', response.status);
            
            if (response.ok) {
              console.log('✅ Notifica creata! Aggiorno badge...');
              await new Promise(resolve => setTimeout(resolve, 500));
              await fetchNotifications();
              console.log('✅ Badge aggiornato!');
            }
          } else {
            console.log('⚠️ Nessun token, utente non loggato');
          }
        } else {
          console.log('⏭️ Stessa versione, skip');
        }
      } catch (err) {
        console.error('❌ Errore:', err);
      }
    };
    
    checkVersion();
    const interval = setInterval(checkVersion, 120000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  return null;
}