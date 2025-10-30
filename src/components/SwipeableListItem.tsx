// src/components/SwipeableListItem.tsx
import { ReactNode, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { Pencil, Trash } from "lucide-react";

export interface SwipeableListItemProps {
  children: ReactNode;
  label: string;
  onEdit: () => void;
  onDelete: () => void;
}

const ACTION_WIDTH = 60; // Quanto swipe mostra
const BUTTON_WIDTH = 100; // Larghezza reale del bottone (molto più largo per nascondere la fine)

export default function SwipeableListItem({ children, label, onEdit, onDelete }: SwipeableListItemProps) {
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

  const handleStart = (x: number) => {
    startXRef.current = x;
    currentXRef.current = x;
    movedRef.current = false;
    setDragging(true);
  };

  const handleMove = (x: number) => {
    if (!dragging) return;
    const dx = x - startXRef.current;
    if (Math.abs(dx) > 5) movedRef.current = true;
    currentXRef.current = x;
    const clamped = Math.max(-ACTION_WIDTH * 1.2, Math.min(ACTION_WIDTH * 1.2, dx));
    xTo.current(clamped);
  };

  const handleEnd = () => {
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
          Elimina Lista
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
      <div className="relative overflow-hidden rounded-xl">
        {/* Azione Sinistra - MODIFICA (nascosta inizialmente, rivelata quando swipe destro) */}
        <div
          className="absolute inset-y-0 bg-yellow-400/80 backdrop-blur-sm"
          style={{ width: BUTTON_WIDTH, left: -40 }}
        >
          <button
            onClick={onEdit}
            className="w-full h-full flex items-center justify-center text-white hover:bg-yellow-500/80 transition-all"
          >
            <Pencil size={20} />
          </button>
        </div>

        {/* Azione Destra - ELIMINA (nascosta inizialmente, rivelata quando swipe sinistro) */}
        <div
          className="absolute inset-y-0 bg-red-500/80 backdrop-blur-sm"
          style={{ width: BUTTON_WIDTH, right: -40 }}
        >
          <button
            onClick={() => setShowConfirm(true)}
            className="w-full h-full flex items-center justify-center text-white hover:bg-red-600/80 transition-all"
          >
            <Trash size={20} />
          </button>
        </div>

        {/* Contenuto principale swipeable */}
        <div
          ref={wrapperRef}
          onMouseDown={(e) => handleStart(e.clientX)}
          onMouseMove={(e) => handleMove(e.clientX)}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={(e) => handleStart(e.touches[0].clientX)}
          onTouchMove={(e) => handleMove(e.touches[0].clientX)}
          onTouchEnd={handleEnd}
          onClick={onClickWrapper}
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