import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { fetchFriends, removeFriend, Friendship } from "../api/friends";
import UserCard from "../components/UserCard";
import { useTheme } from "../context/ThemeContext";
import BottomNav from "../components/BottomNav";
import LoadingOverlay from "../components/LoadingOverlay";

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { themeLoaded } = useTheme();

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      const data = await fetchFriends();
      setFriends(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId: number) => {
    if (!confirm("Sei sicuro di voler rimuovere questo amico?")) return;

    try {
      await removeFriend(userId);
      setFriends(friends.filter((f) => f.friend.id !== userId));
      alert("Amico rimosso");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      alert("Errore nella rimozione");
    }
  };

  if (!themeLoaded) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-purple-900 dark:via-gray-800 dark:to-pink-900 text-gray-900 dark:text-white p-6 pb-24 lg:pb-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">I Miei Amici</h1>
        <button
          onClick={() => navigate("/home")}
          className="flex items-center gap-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg px-4 py-2 rounded-xl border border-gray-200/50 dark:border-white/20 hover:bg-white/70 dark:hover:bg-gray-800/70 transition-all"
        >
          <ArrowLeft size={20} />
          <span className="hidden sm:inline">Home</span>
        </button>
      </div>

      {loading ? (
        <LoadingOverlay />
      ) : friends.length === 0 ? (
        <p className="text-center text-gray-500 mt-10">
          Non hai ancora amici
        </p>
      ) : (
        <div className="space-y-3">
          {friends.map((friendship) => (
            <UserCard
              key={friendship.id}
              user={friendship.friend}
              buttonText="Rimuovi"
              buttonColor="bg-red-600/80 hover:bg-red-600/90"
              onAction={() => handleRemove(friendship.friend.id)}
            />
          ))}
        </div>
      )}

      <BottomNav
        showHome={true}
        showProfile={true}
      />
    </div>
  );
}