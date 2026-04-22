import { useState, useEffect, useCallback } from 'react';
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

export function usePWAUpdate() {
  const [showUpdatePopup, setShowUpdatePopup] = useState(false);
  const [showUpdateLoader, setShowUpdateLoader] = useState(false);
  const [changelog, setChangelog] = useState<Changelog | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
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

    // Update the service worker
    const updatePromise = updateServiceWorker(true);

    // Wait for both minimum time and update
    await Promise.all([minLoadTime, updatePromise]);

    // Reload the page
    window.location.reload();
  }, [updateServiceWorker]);

  const handleUpdateLater = useCallback(() => {
    setShowUpdatePopup(false);
    setNeedRefresh(false);
    // pendingUpdate stays true so notification can show update button
  }, [setNeedRefresh]);

  const triggerUpdate = useCallback(() => {
    setShowUpdateLoader(true);
    setTimeout(() => {
      updateServiceWorker(true);
      window.location.reload();
    }, 3000);
  }, [updateServiceWorker]);

  return {
    showUpdatePopup,
    showUpdateLoader,
    changelog,
    pendingUpdate,
    needRefresh,
    handleUpdateNow,
    handleUpdateLater,
    triggerUpdate,
    setShowUpdatePopup,
  };
}
