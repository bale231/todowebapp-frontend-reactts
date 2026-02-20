import { useEffect, useRef, useState } from "react";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";
import { useNetwork } from "../context/NetworkContext";
import gsap from "gsap";

export default function OfflineBanner() {
  const { isOnline, pendingSyncCount, syncNow } = useNetwork();
  const [showBanner, setShowBanner] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);
  const reconnectedRef = useRef<HTMLDivElement>(null);

  // Show banner when offline
  useEffect(() => {
    if (!isOnline) {
      setShowBanner(true);
      setWasOffline(true);
    } else if (wasOffline) {
      // Just came back online
      setShowBanner(false);
      setShowReconnected(true);

      // Hide reconnected message after 3s
      const timer = setTimeout(() => {
        if (reconnectedRef.current) {
          gsap.to(reconnectedRef.current, {
            y: -100,
            opacity: 0,
            duration: 0.3,
            ease: "power2.in",
            onComplete: () => {
              setShowReconnected(false);
              setWasOffline(false);
            },
          });
        } else {
          setShowReconnected(false);
          setWasOffline(false);
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  // Animate banner in
  useEffect(() => {
    if (showBanner && bannerRef.current) {
      gsap.fromTo(
        bannerRef.current,
        { y: -100, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "back.out(1.5)" }
      );
    }
  }, [showBanner]);

  // Animate reconnected message in
  useEffect(() => {
    if (showReconnected && reconnectedRef.current) {
      gsap.fromTo(
        reconnectedRef.current,
        { y: -100, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "back.out(1.5)" }
      );
    }
  }, [showReconnected]);

  if (!showBanner && !showReconnected) return null;

  return (
    <>
      {/* Offline banner */}
      {showBanner && (
        <div className="fixed top-0 left-0 right-0 z-[9999]">
          <div
            ref={bannerRef}
            className="bg-orange-500/95 backdrop-blur-xl text-white px-4 py-3 flex items-center justify-center gap-3 shadow-lg"
          >
            <WifiOff size={20} />
            <span className="font-medium text-sm">
              Sei offline — Le modifiche verranno sincronizzate quando torni online
            </span>
            {pendingSyncCount > 0 && (
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {pendingSyncCount} in coda
              </span>
            )}
          </div>
        </div>
      )}

      {/* Reconnected message */}
      {showReconnected && (
        <div className="fixed top-0 left-0 right-0 z-[9999]">
          <div
            ref={reconnectedRef}
            className="bg-green-500/95 backdrop-blur-xl text-white px-4 py-3 flex items-center justify-center gap-3 shadow-lg"
          >
            <Wifi size={20} />
            <span className="font-medium text-sm">
              Sei di nuovo online
            </span>
            {pendingSyncCount > 0 && (
              <button
                onClick={() => syncNow()}
                className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-xs transition-all"
              >
                <RefreshCw size={14} />
                Sincronizza ({pendingSyncCount})
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
