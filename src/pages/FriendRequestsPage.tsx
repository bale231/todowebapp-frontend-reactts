import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, X } from "lucide-react";
import {
  fetchFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  FriendRequest,
} from "../api/friends";
import { useTheme } from "../context/ThemeContext";

export default function FriendRequestsPage() {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { themeLoaded } = useTheme();

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const data = await fetchFriendRequests();
      setRequests(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId: number) => {
    try {
      await acceptFriendRequest(requestId);
      setRequests(requests.filter((r) => r.id !== requestId));
      alert("Richiesta accettata!");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      alert("Errore nell'accettazione");
    }
  };

  const handleReject = async (requestId: number) => {
    try {
      await rejectFriendRequest(requestId);
      setRequests(requests.filter((r) => r.id !== requestId));
      alert("Richiesta rifiutata");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      alert("Errore nel rifiuto");
    }
  };

  if (!themeLoaded) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-green-900 dark:via-gray-800 dark:to-blue-900 text-gray-900 dark:text-white p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Richieste di Amicizia</h1>
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
      ) : requests.length === 0 ? (
        <p className="text-center text-gray-500 mt-10">
          Nessuna richiesta in sospeso
        </p>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="flex items-center justify-between bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg p-4 rounded-xl border border-gray-200/50 dark:border-white/20"
            >
              <div className="flex items-center gap-3">
                {request.from_user.profile_picture ? (
                  <img
                    src={request.from_user.profile_picture}
                    alt={request.from_user.full_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xl font-bold">
                    {request.from_user.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-lg">
                    {request.from_user.full_name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    @{request.from_user.username}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleAccept(request.id)}
                  className="p-2 bg-green-600/80 hover:bg-green-600/90 text-white rounded-lg transition-all"
                >
                  <Check size={20} />
                </button>
                <button
                  onClick={() => handleReject(request.id)}
                  className="p-2 bg-red-600/80 hover:bg-red-600/90 text-white rounded-lg transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}