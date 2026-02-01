interface ListCardSkeletonProps {
  count?: number;
}

export default function ListCardSkeleton({ count = 6 }: ListCardSkeletonProps) {
  // Array of different "colors" for the left border to simulate variety
  const borderColors = [
    "border-l-blue-500/50",
    "border-l-green-500/50",
    "border-l-yellow-500/50",
    "border-l-red-500/50",
    "border-l-purple-500/50",
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`relative p-4 bg-white/70 dark:bg-gray-800/70 border border-gray-200/50 dark:border-white/20 rounded-xl shadow-lg border-l-4 min-h-[120px] overflow-hidden ${
            borderColors[index % borderColors.length]
          }`}
        >
          {/* Shimmer overlay */}
          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent" />

          {/* Content skeleton */}
          <div className="space-y-3">
            {/* Title skeleton */}
            <div
              className="h-6 bg-gray-300/60 dark:bg-gray-600/60 rounded-md"
              style={{ width: `${60 + (index % 3) * 15}%` }}
            />

            {/* Subtitle skeleton */}
            <div
              className="h-4 bg-gray-200/60 dark:bg-gray-700/60 rounded-md"
              style={{ width: `${75 + (index % 2) * 10}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
