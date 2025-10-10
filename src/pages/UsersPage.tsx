import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { fetchUsers, sendFriendRequest, User } from "../api/friends";
import UserCard from "../components/UserCard";
import { useTheme } from "../context/ThemeContext";
import AnimatedAlert from "../components/AnimatedAlert";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { themeLoaded } = useTheme();
  
  // ✅ State per l'alert
  const [alert, setAlert] = useState<{
    type: "success" | "error" | "warning";
    message: string;
  } | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (userId: number) => {
    try {
      await sendFriendRequest(userId);
      loadUsers();
      // ✅ Mostra alert di successo
      setAlert({
        type: "success",
        message: "Richiesta inviata con successo!"
      });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Errore completo:", error);
      // ✅ Mostra alert di errore
      setAlert({
        type: "error",
        message: error.message || "Errore nell'invio della richiesta"
      });
    }
  };

  const getButtonConfig = (status?: string) => {
    switch (status) {
      case "friends":
        return {
          text: "Amici ✓",
          color: "bg-green-600/80 cursor-not-allowed",
          disabled: true
        };
      case "pending_sent":
        return {
          text: "Richiesta Inviata",
          color: "bg-gray-400 cursor-not-allowed",
          disabled: true
        };
      case "pending_received":
        return {
          text: "Rispondi",
          color: "bg-orange-600/80 hover:bg-orange-600/90",
          disabled: false,
          action: "respond"
        };
      case "rejected":
        return {
          text: "Richiesta Rifiutata",
          color: "bg-red-600/80 cursor-not-allowed",
          disabled: true
        };
      default:
        return {
          text: "Aggiungi",
          color: "bg-blue-600/80 hover:bg-blue-600/90",
          disabled: false
        };
    }
  };

  if (!themeLoaded) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-blue-900 dark:via-gray-800 dark:to-purple-900 text-gray-900 dark:text-white p-6 pb-24">
      {/* ✅ Mostra alert se presente */}
      {alert && (
        <AnimatedAlert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Utenti</h1>
        <button
          onClick={() => navigate("/home")}
          className="flex items-center gap-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg px-4 py-2 rounded-xl border border-gray-200/50 dark:border-white/20 hover:bg-white/70 dark:hover:bg-gray-800/70 transition-all"
        >
          <ArrowLeft size={20} />
          <span className="hidden sm:inline">Home</span>
        </button>
      </div>

      {loading ? (
        <p>Caricamento...</p>
      ) : users.length === 0 ? (
        <p className="text-center text-gray-500 mt-10">
          Nessun utente disponibile
        </p>
      ) : (
        <div className="space-y-3 pb-8">
          {users.map((user) => {
            const buttonConfig = getButtonConfig(user.friendship_status);
            
            return (
              <UserCard
                key={user.id}
                user={user}
                buttonText={buttonConfig.text}
                buttonColor={buttonConfig.color}
                onAction={() => {
                  if (buttonConfig.action === "respond") {
                    navigate("/friend-requests");
                  } else if (!buttonConfig.disabled) {
                    handleSendRequest(user.id);
                  }
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}