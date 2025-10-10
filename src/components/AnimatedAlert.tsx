import { useEffect, useRef } from "react";
import { AlertCircle, CheckCircle, XCircle, X } from "lucide-react";
import gsap from "gsap";

interface AnimatedAlertProps {
  type: "success" | "error" | "warning";
  message: string;
  onClose: () => void;
}

export default function AnimatedAlert({ type, message, onClose }: AnimatedAlertProps) {
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (alertRef.current) {
      // Animazione entrata
      gsap.fromTo(
        alertRef.current,
        {
          y: -100,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: "back.out(1.5)",
        }
      );

      // Auto-chiusura dopo 4 secondi
      const timer = setTimeout(() => {
        handleClose();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    if (alertRef.current) {
      gsap.to(alertRef.current, {
        y: -100,
        opacity: 0,
        duration: 0.3,
        ease: "power2.in",
        onComplete: onClose,
      });
    }
  };

  const config = {
    success: {
      icon: CheckCircle,
      bg: "bg-green-500/90",
      border: "border-green-400",
    },
    error: {
      icon: XCircle,
      bg: "bg-red-500/90",
      border: "border-red-400",
    },
    warning: {
      icon: AlertCircle,
      bg: "bg-yellow-500/90",
      border: "border-yellow-400",
    },
  };

  const { icon: Icon, bg, border } = config[type];

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999]">
      <div
        ref={alertRef}
        className={`${bg} ${border} backdrop-blur-xl border-2 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[300px] max-w-md`}
      >
        <Icon size={24} />
        <p className="flex-1 font-medium">{message}</p>
        <button
          onClick={handleClose}
          className="hover:bg-white/20 p-1 rounded-lg transition-colors"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}