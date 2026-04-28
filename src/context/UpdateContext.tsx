import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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
        // Check once after 1 minute, then every hour — not constantly
        setTimeout(() => registration.update(), 60 * 1000);
        setInterval(() => registration.update(), 60 * 60 * 1000);
      }
    },
    onNeedRefresh() {
      fetchChangelog().then((data) => {
        if (!data) return;
        const seenVersion = localStorage.getItem('lastSeenUpdateVersion');
        if (seenVersion === data.version) return; // already shown for this version
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
      if (res.ok) {
        const data: Changelog = await res.json();
        return data;
      }
    } catch (err) {
      console.error('Errore caricamento changelog:', err);
    }
    return null;
  };

  const handleUpdateNow = useCallback(async () => {
    setShowUpdatePopup(false);
    setShowUpdateLoader(true);
    localStorage.removeItem('pendingAppUpdate');
    localStorage.removeItem('lastSeenUpdateVersion');

    const minLoadTime = new Promise(resolve => setTimeout(resolve, 3000));
    const updatePromise = updateServiceWorker(true);

    await Promise.all([minLoadTime, updatePromise]);
    window.location.reload();
  }, [updateServiceWorker]);

  const handleUpdateLater = useCallback(() => {
    setShowUpdatePopup(false);
    setNeedRefresh(false);
    // Mark this version as seen so popup doesn't reappear for same version
    if (changelog) {
      localStorage.setItem('lastSeenUpdateVersion', changelog.version);
    }
  }, [setNeedRefresh, changelog]);

  const triggerUpdate = useCallback(async () => {
    setShowUpdateLoader(true);

    const minLoadTime = new Promise(resolve => setTimeout(resolve, 3000));
    const updatePromise = updateServiceWorker(true);

    await Promise.all([minLoadTime, updatePromise]);
    window.location.reload();
  }, [updateServiceWorker]);

  // Restore pending update state on mount (for notification bell only, no popup)
  useEffect(() => {
    const hasPendingUpdate = localStorage.getItem('pendingAppUpdate') === 'true';
    if (hasPendingUpdate) {
      fetchChangelog().then((data) => {
        if (data) setChangelog(data);
        setPendingUpdate(true);
      });
    }
  }, []);

  // Persist pending update state
  useEffect(() => {
    if (pendingUpdate) {
      localStorage.setItem('pendingAppUpdate', 'true');
    } else {
      localStorage.removeItem('pendingAppUpdate');
    }
  }, [pendingUpdate]);

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
      }}
    >
      {children}
    </UpdateContext.Provider>
  );
};
