// src/components/SwipeableListItem.tsx
import { ReactNode, useRef, useState, useEffect } from "react";
import gsap from "gsap";
import { Edit, Trash } from "lucide-react";

interface SwipeableListItemProps {
  children: ReactNode;
  onEdit: () => void;
  onDelete: () => void;
}

// larghezza action drawer
const ACTION_WIDTH = 80;

export default function SwipeableListItem({
  children,
  onEdit,
  onDelete,
}: SwipeableListItemProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);

  // Quick setter per animazioni fluide, inizializzato a noop
  const xTo = useRef<(value: number) => void>(() => {});

  useEffect(() => {
    if (wrapperRef.current) {
      xTo.current = gsap.quickTo(wrapperRef.current, "x", {
        duration: 0.5,
        ease: "power4.out",
      });
    }
  }, []);

  const handleStart = (x: number) => {
    startXRef.current = x;
    currentXRef.current = x;
    setDragging(true);
  };

  const handleMove = (x: number) => {
    if (!dragging) return;
    currentXRef.current = x;
    const dx = currentXRef.current - startXRef.current;
    // limita spostamento massimo
    const clamped = Math.max(
      -ACTION_WIDTH * 1.2,
      Math.min(ACTION_WIDTH * 1.2, dx)
    );
    xTo.current(clamped);
  };

  const handleEnd = () => {
    setDragging(false);
    const dx = currentXRef.current - startXRef.current;
    let target = 0;
    if (dx < -ACTION_WIDTH) target = -ACTION_WIDTH;
    else if (dx > ACTION_WIDTH) target = ACTION_WIDTH;
    xTo.current(target);
  };

  const close = () => {
    xTo.current(0);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Azione modifica */}
      <div className="absolute left-0 top-0 bottom-0 w-[80px] flex items-center justify-center bg-yellow-400 z-0">
        <button
          onClick={() => {
            onEdit();
            close();
          }}
        >
          <Edit size={24} />
        </button>
      </div>

      {/* Azione elimina */}
      <div className="absolute right-0 top-0 bottom-0 w-[80px] flex items-center justify-center bg-red-500 z-0">
        <button
          onClick={() => {
            onDelete();
            close();
          }}
        >
          <Trash size={24} />
        </button>
      </div>

      {/* Contenuto swipeable */}
      <div
        ref={wrapperRef}
        className="relative bg-white dark:bg-gray-800 touch-none"
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
        onMouseDown={(e) => handleStart(e.clientX)}
        onMouseMove={(e) => dragging && handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onMouseLeave={dragging ? handleEnd : undefined}
      >
        {children}
      </div>
    </div>
  );
}
