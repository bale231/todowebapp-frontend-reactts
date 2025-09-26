/* eslint-disable @typescript-eslint/no-unused-vars */
// components/notifications/NotificationToast.tsx - Toast per notifiche real-time
import React, { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useNotifications } from '../../hooks/useNotifications';

export const NotificationToast: React.FC = () => {
  const { refreshNotifications, refreshStats } = useNotifications();

  useEffect(() => {
    // Listener per messaggi dal service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PUSH_RECEIVED') {
        const { title, body, data } = event.data.notification;
        
        // Mostra toast
        toast.success(
          <div>
            <strong>{title}</strong>
            <p className="text-sm mt-1">{body}</p>
          </div>,
          {
            duration: 5000,
            icon: '🚀',
          }
        );

        // Aggiorna notifiche
        refreshNotifications();
        refreshStats();
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
    };
  }, [refreshNotifications, refreshStats]);

  return null;
};