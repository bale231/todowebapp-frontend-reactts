import { useState, useEffect, useCallback } from "react";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const requireOnline = useCallback(
    (
      onOffline?: () => void
    ): boolean => {
      if (!navigator.onLine) {
        onOffline?.();
        return false;
      }
      return true;
    },
    []
  );

  return { isOnline, requireOnline };
}
