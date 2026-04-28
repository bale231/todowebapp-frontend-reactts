import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface ChangelogEntry {
  type: 'new' | 'fix' | 'improvement';
  title: string;
  description: string;
}

interface Changelog {
  version: string;
  date: string;
  changes: ChangelogEntry[];
}

interface UpdateContextType {
  showUpdatePopup: boolean;
  showUpdateLoader: boolean;
  changelog: Changelog | null;
  pendingUpdate: boolean;
  handleUpdateNow: () => void;
  handleUpdateLater: () => void;
  triggerUpdate: () => void;
  dismissPendingUpdate: () => void;
}

const UpdateContext = createContext<UpdateContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useUpdate = () => {
  const context = useContext(UpdateContext);
  if (!context) {
    throw new Error('useUpdate must be used within UpdateProvider');
  }
  return context;
};

interface UpdateProviderProps {
  children: ReactNode;
}

export const UpdateProvider = ({ children }: UpdateProviderProps) => {
  // Remove legacy localStorage key from old implementation
  localStorage.removeItem('pendingAppUpdate');

  const [showUpdatePopup, setShowUpdatePopup] = useState(false);
  const [showUpdateLoader, setShowUpdateLoader] = useState(false);
  const [changelog, setChangelog] = useState<Changelog | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState(false);

  const {
    needRefresh: [, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        setTimeout(() => registration.update(), 60 * 1000);
        setInterval(() => registration.update(), 60 * 60 * 1000);
      }
    },
    onNeedRefresh() {
      fetchChangelog().then((data) => {
        if (!data) return;
        const seenVersion = localStorage.getItem('lastSeenUpdateVersion');
        if (seenVersion === data.version) return;
        setChangelog(data);
        setPendingUpdate(true);
        setShowUpdatePopup(true);
      });
    },
    onOfflineReady() {},
  });

  const fetchChangelog = async (): Promise<Changelog | null> => {
    try {
      const res = await fetch('/changelog.json?t=' + Date.now());
      if (res.ok) return await res.json();
    } catch (err) {
      console.error('Errore caricamento changelog:', err);
    }
    return null;
  };

  const handleUpdateNow = useCallback(async () => {
    setShowUpdatePopup(false);
    setShowUpdateLoader(true);
    localStorage.removeItem('lastSeenUpdateVersion');

    const minLoadTime = new Promise(resolve => setTimeout(resolve, 3000));
    await Promise.all([minLoadTime, updateServiceWorker(true)]);
    window.location.reload();
  }, [updateServiceWorker]);

  const handleUpdateLater = useCallback(() => {
    setShowUpdatePopup(false);
    setNeedRefresh(false);
    if (changelog) {
      localStorage.setItem('lastSeenUpdateVersion', changelog.version);
    }
  }, [setNeedRefresh, changelog]);

  const triggerUpdate = useCallback(async () => {
    setShowUpdateLoader(true);
    localStorage.removeItem('lastSeenUpdateVersion');

    const minLoadTime = new Promise(resolve => setTimeout(resolve, 3000));
    await Promise.all([minLoadTime, updateServiceWorker(true)]);
    window.location.reload();
  }, [updateServiceWorker]);

  const dismissPendingUpdate = useCallback(() => {
    setPendingUpdate(false);
    if (changelog) {
      localStorage.setItem('lastSeenUpdateVersion', changelog.version);
    }
  }, [changelog]);

  return (
    <UpdateContext.Provider
      value={{
        showUpdatePopup,
        showUpdateLoader,
        changelog,
        pendingUpdate,
        handleUpdateNow,
        handleUpdateLater,
        triggerUpdate,
        dismissPendingUpdate,
      }}
    >
      {children}
    </UpdateContext.Provider>
  );
};
