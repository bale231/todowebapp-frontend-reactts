import { useRef, useEffect, useState, useCallback } from "react";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function SearchBar({
  isOpen,
  onClose,
  onSearch,
  placeholder = "Cerca...",
  autoFocus = true,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search - 300ms delay for performance
  const debouncedSearch = useCallback(
    (value: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onSearch(value);
      }, 300);
    },
    [onSearch]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  const handleClear = () => {
    setQuery("");
    onSearch("");
    inputRef.current?.focus();
  };

  const handleClose = () => {
    setQuery("");
    onSearch("");
    onClose();
  };

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleClose();
    }
  };

  // Focus input when opened
  useEffect(() => {
    if (isOpen && autoFocus) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, autoFocus]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in">
      <div className="relative flex items-center">
        {/* Search icon */}
        <div className="absolute left-4 text-gray-400 dark:text-gray-500 pointer-events-none">
          <Search size={20} />
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-12 pr-24 py-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl
                     border border-gray-200/50 dark:border-white/20 rounded-2xl
                     text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                     focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400
                     shadow-lg transition-all duration-200
                     text-base font-medium"
        />

        {/* Action buttons */}
        <div className="absolute right-2 flex items-center gap-1">
          {/* Clear button - only show when there's text */}
          {query && (
            <button
              onClick={handleClear}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                         hover:bg-gray-100/50 dark:hover:bg-gray-700/50 rounded-xl transition-all"
              title="Cancella"
            >
              <X size={18} />
            </button>
          )}

          {/* Close button */}
          <button
            onClick={handleClose}
            className="px-3 py-1.5 text-sm font-medium text-gray-500 dark:text-gray-400
                       hover:text-gray-700 dark:hover:text-gray-200
                       hover:bg-gray-100/50 dark:hover:bg-gray-700/50
                       rounded-xl transition-all"
          >
            Chiudi
          </button>
        </div>
      </div>

      {/* Search hint */}
      {!query && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
          Premi <kbd className="px-1.5 py-0.5 bg-gray-200/50 dark:bg-gray-700/50 rounded text-xs">Esc</kbd> per chiudere
        </p>
      )}
    </div>
  );
}
