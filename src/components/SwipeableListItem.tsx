// src/components/SwipeableListItem.tsx
import { ReactNode, useRef, useState } from "react";
import gsap from "gsap";
import { Edit, Trash } from "lucide-react";

interface SwipeableListItemProps {
  children: ReactNode;
  onEdit: () => void;
  onDelete: () => void;
}

const ACTION_WIDTH = 80; // larghezza in px del div azione

export default function SwipeableListItem({ children, onEdit, onDelete }: SwipeableListItemProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);

  // Inizio del touch/mouse
  const handleStart = (x: number) => {
    startXRef.current = x;
    setDragging(true);
  };

  // Durante il touch/move
  const handleMove = (x: number) => {
    if (!dragging) return;
    currentXRef.current = x;
    const dx = currentXRef.current - startXRef.current;
    if (wrapperRef.current) gsap.to(wrapperRef.current, { x: dx, duration: 0 });
  };

  // Fine del touch/mouse
  const handleEnd = () => {
    setDragging(false);
    const dx = currentXRef.current - startXRef.current;
    if (!wrapperRef.current) return;

    // Se superi soglia, mantieni aperto altrimenti resetta
    if (dx < -ACTION_WIDTH) {
      gsap.to(wrapperRef.current, { x: -ACTION_WIDTH, duration: 0.2, ease: "power2.out" });
    } else if (dx > ACTION_WIDTH) {
      gsap.to(wrapperRef.current, { x: ACTION_WIDTH, duration: 0.2, ease: "power2.out" });
    } else {
      gsap.to(wrapperRef.current, { x: 0, duration: 0.2, ease: "power2.out" });
    }
  };

  // Chiude le azioni (dopo click)
  const close = () => {
    if (wrapperRef.current) gsap.to(wrapperRef.current, { x: 0, duration: 0.2, ease: "power2.out" });
  };

  return (
    <div className="relative overflow-hidden">
      {/* Azione modifica (swipe a sinistra) */}
      <div className="absolute left-0 top-0 bottom-0 w-[80px] flex items-center justify-center bg-yellow-400 z-0">
        <button onClick={() => { onEdit(); close(); }}>
          <Edit size={24} />
        </button>
      </div>

      {/* Azione elimina (swipe a destra) */}
      <div className="absolute right-0 top-0 bottom-0 w-[80px] flex items-center justify-center bg-red-500 z-0">
        <button onClick={() => { onDelete(); close(); }}>
          <Trash size={24} />
        </button>
      </div>

      {/* Contenuto card swipeable */}
      <div
        ref={wrapperRef}
        className="relative bg-white dark:bg-gray-800"
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
        onMouseDown={(e) => handleStart(e.clientX)}
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onMouseLeave={dragging ? handleEnd : undefined}
      >
        {children}
      </div>
    </div>
  );
}