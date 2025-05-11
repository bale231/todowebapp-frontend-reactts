// src/components/SwipeableListItem.tsx
import { ReactNode, useRef, useState, useEffect } from "react";
import gsap from "gsap";
import { Edit, Trash } from "lucide-react";

interface SwipeableListItemProps {
  children: ReactNode;
  onEdit: () => void;
  onDelete: () => void;
}

const ACTION_WIDTH = 80;

export default function SwipeableListItem({
  children,
  onEdit,
  onDelete,
}: SwipeableListItemProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
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

  const closeSwipe = () => {
    xTo.current(0);
  };

  const confirmDelete = () => {
    setShowConfirm(true);
  };

  const handleConfirmYes = () => {
    onDelete();
    setShowConfirm(false);
    closeSwipe();
  };

  const handleConfirmNo = () => {
    setShowConfirm(false);
    closeSwipe();
  };

  return (
    <>
      <div className="relative overflow-hidden">
        {/* Azione modifica */}
        <div className="absolute left-0 top-0 bottom-0 w-[80px] flex items-center justify-center bg-yellow-400 z-0">
          <button
            onClick={() => {
              onEdit();
              closeSwipe();
            }}
          >
            <Edit size={24} />
          </button>
        </div>

        {/* Azione elimina */}
        <div className="absolute right-0 top-0 bottom-0 w-[80px] flex items-center justify-center bg-red-500 z-0">
          <button onClick={confirmDelete}>
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

      {/* Modale di conferma eliminazione */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg w-80">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Conferma Eliminazione
            </h2>
            <p className="mb-6 text-gray-700 dark:text-gray-300">
              Sei sicuro di voler eliminare questa lista? Questa operazione non
              può essere annullata.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={handleConfirmNo}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 rounded hover:bg-gray-300"
              >
                Annulla
              </button>
              <button
                onClick={handleConfirmYes}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
