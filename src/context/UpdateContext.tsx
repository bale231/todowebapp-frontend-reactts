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
    onNeedRefresh() {
      setPendingUpdate(true);
      setShowUpdatePopup(true);
      fetchChangelog();
    },
    onOfflineReady() {
      console.log('App pronta per uso offline');
    },
  });

  const fetchChangelog = async () => {
    try {
      const res = await fetch('/changelog.json?t=' + Date.now());
      if (res.ok) {
        const data = await res.json();
        setChangelog(data);
      }
    } catch (err) {
      console.error('Errore caricamento changelog:', err);
    }
  };

  const handleUpdateNow = useCallback(async () => {
    setShowUpdatePopup(false);
    setShowUpdateLoader(true);

    // Minimum 3 seconds loading
    const minLoadTime = new Promise(resolve => setTimeout(resolve, 3000));
    const updatePromise = updateServiceWorker(true);

    await Promise.all([minLoadTime, updatePromise]);
    window.location.reload();
  }, [updateServiceWorker]);

  const handleUpdateLater = useCallback(() => {
    setShowUpdatePopup(false);
    setNeedRefresh(false);
    // pendingUpdate stays true so notification can show update button
  }, [setNeedRefresh]);

  const triggerUpdate = useCallback(async () => {
    setShowUpdateLoader(true);

    const minLoadTime = new Promise(resolve => setTimeout(resolve, 3000));
    const updatePromise = updateServiceWorker(true);

    await Promise.all([minLoadTime, updatePromise]);
    window.location.reload();
  }, [updateServiceWorker]);

  // Check for pending update on mount (in case user closed the popup before)
  useEffect(() => {
    const hasPendingUpdate = localStorage.getItem('pendingAppUpdate') === 'true';
    if (hasPendingUpdate) {
      setPendingUpdate(true);
      fetchChangelog();
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
