import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { processSyncQueue } from "../services/syncService";

interface NetworkContextType {
  isOnline: boolean;
  /** Returns true if online, false if offline. Shows alert callback when offline. */
  requireOnline: (onOffline?: () => void) => boolean;
  /** Number of pending sync operations */
  pendingSyncCount: number;
  /** Force a sync attempt */
  syncNow: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export function useNetwork() {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error("useNetwork must be used within NetworkProvider");
  return ctx;
}

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const syncingRef = useRef(false);

  // Track online/offline
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Process sync queue when coming back online
  const syncNow = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    try {
      const remaining = await processSyncQueue();
      setPendingSyncCount(remaining);
    } finally {
      syncingRef.current = false;
    }
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline) {
      syncNow();
    }
  }, [isOnline, syncNow]);

  const requireOnline = useCallback(
    (onOffline?: () => void): boolean => {
      if (!navigator.onLine) {
        onOffline?.();
        return false;
      }
      return true;
    },
    []
  );

  return (
    <NetworkContext.Provider
      value={{ isOnline, requireOnline, pendingSyncCount, syncNow }}
    >
      {children}
    </NetworkContext.Provider>
  );
}
