interface TodoSkeletonProps {
  count?: number;
}

export default function TodoSkeleton({ count = 5 }: TodoSkeletonProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="relative flex items-center bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg px-6 py-4 rounded-xl border border-gray-200/50 dark:border-white/20 shadow-lg overflow-hidden"
        >
          {/* Shimmer overlay */}
          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent" />

          {/* Checkbox placeholder */}
          <div className="w-5 h-5 bg-gray-300/60 dark:bg-gray-600/60 rounded mr-3 flex-shrink-0" />

          {/* Content */}
          <div className="flex-1 space-y-2">
            {/* Title placeholder */}
            <div
              className="h-5 bg-gray-300/60 dark:bg-gray-600/60 rounded"
              style={{ width: `${50 + (index % 4) * 12}%` }}
            />
            {/* Optional quantity badge placeholder (show on some items) */}
            {index % 3 === 0 && (
              <div className="h-4 w-16 bg-blue-300/40 dark:bg-blue-600/40 rounded-full" />
            )}
          </div>

          {/* Drag handle placeholder */}
          <div className="w-6 h-6 bg-gray-300/60 dark:bg-gray-600/60 rounded ml-3 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}
