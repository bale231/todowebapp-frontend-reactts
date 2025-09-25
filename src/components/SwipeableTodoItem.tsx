// src/components/SwipeableTodoItem.tsx
import { ReactNode, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { Pencil, Trash } from "lucide-react";

interface SwipeableTodoItemProps {
  children: ReactNode;
  label: string;             // Nome dell'item da mostrare in modale
  onEdit: () => void;
  onDelete: () => void;
}

const ACTION_WIDTH = 60;

export default function SwipeableTodoItem({ children, label, onEdit, onDelete }: SwipeableTodoItemProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const movedRef = useRef(false);
  const xTo = useRef<(value: number) => void>(() => {});
  const modalInnerRef = useRef<HTMLDivElement>(null);

  // setup quickTo per lo swipe
  useEffect(() => {
    if (wrapperRef.current) {
      xTo.current = gsap.quickTo(wrapperRef.current, "x", {
        duration: 0.5,
        ease: "power4.out",
      });
    }
  }, []);

  // animazione comparsa modale
  useEffect(() => {
    if (showConfirm && modalInnerRef.current) {
      gsap.fromTo(
        modalInnerRef.current,
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.4, ease: "power2.out" }
      );
    }
  }, [showConfirm]);

  // gesture handlers
  const handleStart = (x: number) => { startXRef.current = x; currentXRef.current = x; movedRef.current = false; setDragging(true); };
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
  const closeSwipe = () => { xTo.current(0); };

  // conferma delete
  const confirmDelete = () => { setShowConfirm(true); closeSwipe(); };
  const handleConfirmYes = () => { onDelete(); setShowConfirm(false); };
  const handleConfirmNo = () => { setShowConfirm(false); };

  // impedisci click se c'è stato swipe
  const onClickWrapper = (e: React.MouseEvent) => { if (movedRef.current) { e.stopPropagation(); movedRef.current = false; } };

  // portale per la modale
  const modalJSX = (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div ref={modalInnerRef} className="bg-white/20 dark:bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/30 dark:border-white/20 shadow-2xl w-80">
        <h2 className="text-xl font-semibold mb-4">Elimina "{label}"?</h2>
        <p className="mb-6">Questa azione non potrà essere annullata.</p>
        <div className="flex justify-between gap-4">
          <button 
            onClick={handleConfirmNo} 
            className="px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg hover:bg-white/30 transition-all"
          >
            Annulla
          </button>
          <button 
            onClick={handleConfirmYes} 
            className="px-4 py-2 bg-red-600/80 backdrop-blur-sm border border-red-300/30 text-white rounded-lg hover:bg-red-600/90 transition-all"
          >
            Elimina
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="relative overflow-visible rounded-xl">
        {/* swipe left: edit */}
        <div className="absolute left-0 top-0 bottom-0 w-[60px] flex items-center justify-center bg-yellow-400/80 backdrop-blur-sm z-0 rounded-l-xl">
          <button 
            onClick={() => { onEdit(); closeSwipe(); }}
            className="text-white hover:text-yellow-100 transition-colors"
          >
            <Pencil size={20} />
          </button>
        </div>
        {/* swipe right: delete */}
        <div className="absolute right-0 top-0 bottom-0 w-[60px] flex items-center justify-center bg-red-500/80 backdrop-blur-sm z-0 rounded-r-xl">
          <button 
            onClick={confirmDelete}
            className="text-white hover:text-red-100 transition-colors"
          >
            <Trash size={20} />
          </button>
        </div>
        <div
          ref={wrapperRef}
          className="relative bg-transparent"
          style={{ touchAction: 'pan-y' }}
          onTouchStart={(e) => handleStart(e.touches[0].clientX)}
          onTouchMove={(e) => { handleMove(e.touches[0].clientX); if (movedRef.current) e.preventDefault(); }}
          onTouchEnd={handleEnd}
          onMouseDown={(e) => handleStart(e.clientX)}
          onMouseMove={(e) => dragging && (handleMove(e.clientX), e.preventDefault())}
          onMouseUp={handleEnd}
          onMouseLeave={dragging ? handleEnd : undefined}
          onClick={onClickWrapper}
        >
          {children}
        </div>
      </div>
      {showConfirm && createPortal(modalJSX, document.body)}
    </>
  );
}