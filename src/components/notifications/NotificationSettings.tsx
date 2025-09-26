// components/notifications/NotificationSettings.tsx
import React, { useState } from 'react';
import { Bell, Smartphone, Monitor, X } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ isOpen, onClose }) => {
  const { 
    preferences, 
    updatePreferences, 
    requestPushPermission, 
    unsubscribeFromPush 
  } = useNotifications();

  const [loading, setLoading] = useState(false);

  const handlePushToggle = async (enabled: boolean) => {
    setLoading(true);
    try {
      if (enabled) {
        const success = await requestPushPermission();
        if (!success) {
          // Se fallisce, non aggiornare lo stato
          return;
        }
      } else {
        await unsubscribeFromPush();
      }
    } catch (error) {
      console.error('Error toggling push notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Impostazioni Notifiche
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Notifiche aggiornamenti */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bell size={20} className="text-blue-500" />
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Aggiornamenti App
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Ricevi notifiche per nuovi aggiornamenti
                </p>
              </div>
            </div>
            <button
              onClick={() => updatePreferences({ updates_enabled: !preferences.updates_enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.updates_enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.updates_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Notifiche in-app */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Monitor size={20} className="text-green-500" />
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Notifiche In-App
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Mostra notifiche nell'applicazione
                </p>
              </div>
            </div>
            <button
              onClick={() => updatePreferences({ in_app_enabled: !preferences.in_app_enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.in_app_enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.in_app_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Push notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Smartphone size={20} className="text-purple-500" />
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Push Notifications
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Ricevi notifiche anche quando l'app è chiusa
                </p>
              </div>
            </div>
            <button
              disabled={loading}
              onClick={() => handlePushToggle(!preferences.push_enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                preferences.push_enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.push_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Info browser support */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="text-blue-600 dark:text-blue-400">
                <Bell size={16} />
              </div>
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">Come funzionano le notifiche:</p>
                <ul className="text-xs space-y-1 text-blue-700 dark:text-blue-400">
                  <li>• Le notifiche in-app sono sempre disponibili</li>
                  <li>• Le push notifications richiedono il permesso del browser</li>
                  <li>• Riceverai notifiche solo per gli aggiornamenti con "Update App"</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};