// src/components/SwipeableTodoItem.tsx
import { ReactNode, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { Pencil, Trash } from "lucide-react";

interface SwipeableTodoItemProps {
  children: ReactNode;
  label: string;
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
}

const ACTION_WIDTH = 60; // Quanto swipe mostra
const BUTTON_WIDTH = 200; // Larghezza reale del bottone (molto più largo per riempire tutto)

export default function SwipeableTodoItem({ children, label, onEdit, onDelete, disabled = false }: SwipeableTodoItemProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const movedRef = useRef(false);
  const xTo = useRef<(value: number) => void>(() => {});
  const modalInnerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (wrapperRef.current) {
      xTo.current = gsap.quickTo(wrapperRef.current, "x", {
        duration: 0.5,
        ease: "power4.out",
      });
    }
  }, []);

  useEffect(() => {
    if (showConfirm && modalInnerRef.current) {
      gsap.fromTo(
        modalInnerRef.current,
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.4, ease: "power2.out" }
      );
    }
  }, [showConfirm]);

  // NUOVO: Resetta posizione quando disabled diventa true
  useEffect(() => {
    if (disabled && wrapperRef.current) {
      gsap.set(wrapperRef.current, { x: 0 }); // Forza posizione 0
    }
  }, [disabled]);

  const handleStart = (x: number) => {
    if (disabled) return; // Non iniziare swipe se disabled
    startXRef.current = x;
    currentXRef.current = x;
    movedRef.current = false;
    setDragging(true);
  };

  const handleMove = (x: number) => {
    if (!dragging || disabled) return; // Non muovere se disabled
    const dx = x - startXRef.current;
    if (Math.abs(dx) > 5) movedRef.current = true;
    currentXRef.current = x;
    const clamped = Math.max(-ACTION_WIDTH * 1.2, Math.min(ACTION_WIDTH * 1.2, dx));
    xTo.current(clamped);
  };

  const handleEnd = () => {
    if (disabled) return; // Non finire swipe se disabled
    setDragging(false);
    const dx = currentXRef.current - startXRef.current;
    const target = dx < -ACTION_WIDTH ? -ACTION_WIDTH : dx > ACTION_WIDTH ? ACTION_WIDTH : 0;
    xTo.current(target);
  };

  const onClickWrapper = (e: React.MouseEvent) => {
    if (movedRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const modalJSX = (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        ref={modalInnerRef}
        className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-3xl p-8 max-w-sm w-full border border-white/20 shadow-2xl"
      >
        <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
          Elimina Todo
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Sei sicuro di voler eliminare "<strong>{label}</strong>"?
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowConfirm(false)}
            className="flex-1 px-4 py-2 bg-gray-100/80 hover:bg-gray-200/80 dark:bg-gray-700/80 dark:hover:bg-gray-600/80 backdrop-blur-sm text-gray-700 dark:text-gray-300 rounded-xl transition-all font-medium"
          >
            Annulla
          </button>
          <button
            onClick={() => {
              onDelete();
              setShowConfirm(false);
            }}
            className="flex-1 px-4 py-2 bg-red-500/80 hover:bg-red-600/80 backdrop-blur-sm text-white rounded-xl transition-all font-medium"
          >
            Elimina
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className={`relative rounded-xl ${disabled ? '' : 'overflow-hidden'}`}>
        {/* Solo se NON disabled, mostra i bottoni di azione */}
        {!disabled && (
          <>
            {/* Azione Sinistra - MODIFICA */}
            <div
              className="absolute inset-y-0 bg-yellow-400/80 backdrop-blur-sm"
              style={{ width: BUTTON_WIDTH, left: -(BUTTON_WIDTH - ACTION_WIDTH) }}
            >
              <button
                onClick={onEdit}
                className="w-full h-full flex items-center justify-end pr-5 text-white hover:bg-yellow-500/80 transition-all"
              >
                <Pencil size={20} />
              </button>
            </div>

            {/* Azione Destra - ELIMINA */}
            <div
              className="absolute inset-y-0 bg-red-500/80 backdrop-blur-sm"
              style={{ width: BUTTON_WIDTH, right: -(BUTTON_WIDTH - ACTION_WIDTH) }}
            >
              <button
                onClick={() => setShowConfirm(true)}
                className="w-full h-full flex items-center justify-start pl-5 text-white hover:bg-red-600/80 transition-all"
              >
                <Trash size={20} />
              </button>
            </div>
          </>
        )}

        {/* Contenuto principale swipeable */}
        <div
          ref={wrapperRef}
          onMouseDown={disabled ? undefined : (e) => handleStart(e.clientX)}
          onMouseMove={disabled ? undefined : (e) => handleMove(e.clientX)}
          onMouseUp={disabled ? undefined : handleEnd}
          onMouseLeave={disabled ? undefined : handleEnd}
          onTouchStart={disabled ? undefined : (e) => handleStart(e.touches[0].clientX)}
          onTouchMove={disabled ? undefined : (e) => handleMove(e.touches[0].clientX)}
          onTouchEnd={disabled ? undefined : handleEnd}
          onClick={disabled ? undefined : onClickWrapper}
          className="relative bg-white dark:bg-gray-800 rounded-xl cursor-grab active:cursor-grabbing"
          style={{ zIndex: 10 }}
        >
          {children}
        </div>
      </div>
      {showConfirm && createPortal(modalJSX, document.body)}
    </>
  );
}