import { User } from "../api/friends";

interface UserCardProps {
  user: User;
  buttonText: string;
  buttonColor: string;
  onAction: () => void;
  showButton?: boolean;
}

export default function UserCard({
  user,
  buttonText,
  buttonColor,
  onAction,
  showButton = true,
}: UserCardProps) {
  // ✅ Funzione per costruire URL completo
  const getImageUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('http')) return url; // URL già completo
    return `https://bale231.pythonanywhere.com${url}`; // Aggiungi dominio
  };

  const profilePictureUrl = getImageUrl(user.profile_picture);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg p-4 rounded-xl border border-gray-200/50 dark:border-white/20 gap-3 overflow-hidden">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {profilePictureUrl ? (
          <img
            src={profilePictureUrl}
            alt={user.full_name}
            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xl font-bold flex-shrink-0">
            {user.full_name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-lg truncate">{user.full_name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            @{user.username}
          </p>
        </div>
      </div>
      {showButton && (
        <button
          onClick={onAction}
          className={`w-full sm:w-auto px-4 py-2 rounded-lg text-white transition-all flex-shrink-0 ${buttonColor}`}
        >
          {buttonText}
        </button>
      )}
    </div>
  );
}