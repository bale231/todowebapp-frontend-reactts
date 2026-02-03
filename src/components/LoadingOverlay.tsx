interface LoadingOverlayProps {
  blur?: boolean;
}

export default function LoadingOverlay({ blur = true }: LoadingOverlayProps) {
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${blur ? 'bg-white/30 dark:bg-gray-900/30 backdrop-blur-md' : 'bg-gray-100 dark:bg-gray-900'}`}>
      <div className="flex flex-col items-center gap-4">
        <img
          src="/assets/logo-themedark.png"
          alt="ToDoApp Logo"
          width={150}
          className="animate-pulse dark:block hidden"
        />
        <img
          src="/assets/logo-themelight.png"
          alt="ToDoApp Logo"
          width={150}
          className="animate-pulse dark:hidden block"
        />
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}
