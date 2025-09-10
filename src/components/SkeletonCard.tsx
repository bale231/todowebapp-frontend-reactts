export default function SkeletonCard() {
  return (
    <div className="relative p-4 bg-white dark:bg-gray-800 rounded shadow border-l-4 border-gray-300 dark:border-gray-700 overflow-hidden">
      <div className="animate-pulse space-y-3">
        <div className="h-5 w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-3 w-5/6 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-3 w-2/3 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_1.7s_infinite]" />
      <style>{`@keyframes shimmer { 100% { transform: translateX(100%); } }`}</style>
    </div>
  );
}
