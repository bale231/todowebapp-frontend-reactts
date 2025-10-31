import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import Navbar from "../components/Navbar";
import {
  getCurrentUserJWT,
  updateProfile,
  deactivateAccount,
  updateNotificationPreferences,
} from "../api/auth";
import { Bell, BellOff, Key } from "lucide-react";

export default function Profile() {
  const formRef = useRef(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const resetPasswordModalRef = useRef<HTMLDivElement>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [success, setSuccess] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error">("success");
  const [clearPicture, setClearPicture] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(true);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);

  useEffect(() => {
    gsap.fromTo(
      formRef.current,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
    );
  }, []);

  useEffect(() => {
    if (showConfirmModal && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 0.3, ease: "power2.out" }
      );
    }
  }, [showConfirmModal]);

  useEffect(() => {
    if (showResetPasswordModal && resetPasswordModalRef.current) {
      gsap.fromTo(
        resetPasswordModalRef.current,
        { scale: 0.9, opacity: 0, y: 20 },
        { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: "back.out(1.2)" }
      );
    }
  }, [showResetPasswordModal]);

  const fetchUserData = async () => {
    const user = await getCurrentUserJWT();
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
      setAvatar(user.profile_picture);
      setPushNotificationsEnabled(user.push_notifications_enabled ?? true);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const showAlert = (message: string, type: "success" | "error") => {
    setSuccess(message);
    setAlertType(type);

    if (!alertRef.current) return;

    gsap.killTweensOf(alertRef.current);
    gsap.set(alertRef.current, { autoAlpha: 0, x: 100 });

    gsap.to(alertRef.current, {
      autoAlpha: 1,
      x: "-100%",
      duration: 0.4,
      ease: "power2.out",
      onComplete: () => {
        setTimeout(() => {
          if (!alertRef.current) return;
          gsap.to(alertRef.current, {
            autoAlpha: 0,
            x: 100,
            duration: 0.4,
            ease: "power2.in",
            onComplete: () => setSuccess(""),
          });
        }, 3000);
      },
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatar(reader.result as string);
      reader.readAsDataURL(file);
      setClearPicture(false);

      const formData = new FormData();
      formData.append("username", username);
      formData.append("email", email);
      formData.append("profile_picture", file);

      const res = await updateProfile(formData);
      if (res.message === "Profile updated") {
        showAlert("Immagine aggiornata con successo", "success");
        fetchUserData();
      } else {
        showAlert("Errore durante l'upload dell'immagine", "error");
      }
    }
  };

  const handleRemoveImage = async () => {
    setAvatar(null);
    setAvatarFile(null);
    setClearPicture(true);
    const formData = new FormData();
    formData.append("username", username);
    formData.append("email", email);
    formData.append("clear_picture", "true");
    const res = await updateProfile(formData);
    if (res.message === "Profile updated") {
      showAlert("Immagine rimossa con successo", "success");
      fetchUserData();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("username", username);
    formData.append("email", email);
    if (avatarFile) formData.append("profile_picture", avatarFile);
    if (clearPicture) formData.append("clear_picture", "true");

    const res = await updateProfile(formData);
    if (res.message === "Profile updated") {
      showAlert("Profilo aggiornato con successo", "success");
      setAvatarFile(null);
      setClearPicture(false);
      setEditMode(false);
      fetchUserData();
    } else {
      showAlert("Errore nell'aggiornamento del profilo", "error");
    }
  };

  const handleDeactivate = async () => {
    setShowConfirmModal(false);
    const res = await deactivateAccount();
    if (res.message === "Account disattivato") {
      showAlert("Account disattivato correttamente.", "success");
      setTimeout(() => (window.location.href = "/"), 2000);
    } else {
      showAlert("Errore nella disattivazione dell'account", "error");
    }
  };

  const handleToggleNotifications = async () => {
    const newValue = !pushNotificationsEnabled;
    setPushNotificationsEnabled(newValue);

    const res = await updateNotificationPreferences(newValue);
    if (res.message === "Preferences updated") {
      showAlert(
        newValue
          ? "Notifiche push attivate"
          : "Notifiche push disattivate (notifiche in-app sempre attive)",
        "success"
      );
    } else {
      showAlert("Errore nell'aggiornamento preferenze", "error");
      setPushNotificationsEnabled(!newValue);
    }
  };

  const handleRequestPasswordReset = async () => {
    setShowResetPasswordModal(false);

    try {
      const response = await fetch("https://bale231.pythonanywhere.com/api/password-reset/request/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        showAlert("Email di reset password inviata! Controlla la tua casella di posta.", "success");
      } else {
        showAlert(data.message || "Errore nell'invio dell'email", "error");
      }
    } catch (error) {
      showAlert("Errore di connessione", "error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white relative">
      <Navbar />
      <div className="fixed top-4 right-4 z-50">
        <div
          ref={alertRef}
          style={{ opacity: 0 }}
          className={`px-4 py-2 rounded shadow-lg text-white font-medium absolute w-[300px] transition-all duration-300 ${
            alertType === "success" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {success}
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div
            ref={modalRef}
            className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-gray-200/50 dark:border-white/20 p-6 rounded-lg shadow-2xl w-80"
          >
            <h3 className="text-lg font-semibold text-center mb-4">
              Conferma disattivazione
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 text-center mb-6">
              Sei sicuro di voler disattivare il tuo account?
            </p>
            <div className="flex justify-between gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-white/20 text-gray-800 dark:text-white rounded-lg hover:bg-white/70 dark:hover:bg-gray-800/70 transition-all"
              >
                Annulla
              </button>
              <button
                onClick={handleDeactivate}
                className="flex-1 px-4 py-2 bg-red-600/80 backdrop-blur-sm border border-red-300/30 text-white rounded-lg hover:bg-red-600/90 transition-all"
              >
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}

      {showResetPasswordModal && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div ref={resetPasswordModalRef} className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-gray-200/50 dark:border-white/20 p-6 rounded-lg shadow-2xl w-80">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <Key size={24} className="text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-center mb-2">
              Reset Password
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 text-center mb-6">
              Ti invieremo un'email con un link per resettare la password.
            </p>
            <div className="flex justify-between gap-3">
              <button
                onClick={() => setShowResetPasswordModal(false)}
                className="flex-1 px-4 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-white/20 text-gray-800 dark:text-white rounded-lg hover:bg-white/70 dark:hover:bg-gray-800/70 transition-all"
              >
                Annulla
              </button>
              <button
                onClick={handleRequestPasswordReset}
                className="flex-1 px-4 py-2 bg-blue-600/80 backdrop-blur-sm border border-blue-300/30 text-white rounded-lg hover:bg-blue-600/90 transition-all"
              >
                Invia email
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto p-4">
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-white/20 rounded-xl p-6 space-y-6 shadow-2xl"
        >
          <h2 className="text-2xl font-bold text-center">Profilo</h2>

          <div className="flex flex-col items-center gap-2">
            <label htmlFor="avatar">
              <div className="w-24 h-24 rounded-full bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm border-2 border-gray-200/50 dark:border-white/20 overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-300 flex items-center justify-center">
                {avatar ? (
                  <img
                    src={`https://bale231.pythonanywhere.com${avatar}`}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-12 h-12 text-gray-500 dark:text-gray-300"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                    />
                  </svg>
                )}
              </div>
            </label>
            <input
              id="avatar"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          <div className="flex justify-between gap-4 items-center">
            {avatar && (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="flex items-center gap-2 text-xs text-white bg-red-500/20 dark:bg-red-600/20 backdrop-blur-md px-4 py-2 border border-red-400/30 dark:border-red-500/30 hover:bg-red-500/30 dark:hover:bg-red-600/30 hover:border-red-400/50 transition-all rounded-lg group shadow-lg"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4 text-red-600 dark:text-red-400 group-hover:rotate-[90deg] transition-transform duration-300"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                <span className="text-red-600 dark:text-red-400">Rimuovi immagine</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditMode((prev) => !prev)}
              className="text-xs bg-blue-500/20 dark:bg-blue-600/20 backdrop-blur-md px-4 py-2 rounded-lg border border-blue-400/30 dark:border-blue-500/30 hover:bg-blue-500/30 dark:hover:bg-blue-600/30 hover:border-blue-400/50 transition-all flex items-center gap-2 group shadow-lg"
            >
              <span className="relative w-4 h-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4 text-blue-600 dark:text-blue-400 absolute top-0 left-0 group-hover:animate-[wiggle_0.3s_ease-in-out_1]"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.862 4.487a2.25 2.25 0 113.182 3.182L7.5 20.213 3 21l.787-4.5L16.862 4.487z"
                  />
                </svg>
              </span>
              <span className="text-blue-600 dark:text-blue-400">
                {editMode ? "Annulla modifica" : "Modifica profilo"}
              </span>
            </button>
          </div>

          {/* SEZIONE NOTIFICHE PUSH */}
          <div className="p-4 bg-blue-50/30 dark:bg-blue-900/20 backdrop-blur-sm border border-blue-200/50 dark:border-blue-500/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {pushNotificationsEnabled ? (
                  <Bell size={20} className="text-blue-600 dark:text-blue-400" />
                ) : (
                  <BellOff size={20} className="text-gray-500 dark:text-gray-400" />
                )}
                <div>
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                    Notifiche Push
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {pushNotificationsEnabled
                      ? "Ricevi notifiche sul dispositivo"
                      : "Solo notifiche in-app"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleNotifications}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  pushNotificationsEnabled
                    ? "bg-blue-600"
                    : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    pushNotificationsEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex flex-col relative">
            <input
              id="username"
              type="text"
              disabled={!editMode}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="peer w-full px-4 pt-6 pb-2 rounded-lg border border-gray-200/50 dark:border-white/20 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm dark:text-white transition duration-300 focus:ring-2 focus:ring-blue-500/50 disabled:opacity-60"
              placeholder="Username"
            />
            <label
              htmlFor="username"
              className="absolute left-4 top-2 text-sm text-gray-500 dark:text-gray-300 transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
            >
              Username
            </label>
          </div>

          <div className="flex flex-col relative">
            <input
              id="email"
              type="email"
              disabled={!editMode}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="peer w-full px-4 pt-6 pb-2 rounded-lg border border-gray-200/50 dark:border-white/20 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm dark:text-white transition duration-300 focus:ring-2 focus:ring-blue-500/50 disabled:opacity-60"
              placeholder="Email"
            />
            <label
              htmlFor="email"
              className="absolute left-4 top-2 text-sm text-gray-500 dark:text-gray-300 transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
            >
              Email
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-col relative">
              <input
                id="password"
                type="password"
                disabled
                value="********"
                className="peer w-full px-4 pt-6 pb-2 rounded-lg border border-gray-200/50 dark:border-white/20 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm dark:text-white transition duration-300 disabled:opacity-60"
              />
              <label
                htmlFor="password"
                className="absolute left-4 top-2 text-sm text-gray-500 dark:text-gray-300"
              >
                Password
              </label>
            </div>
            <button
              type="button"
              onClick={() => setShowResetPasswordModal(true)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline self-start flex items-center gap-1"
            >
              <Key size={14} />
              Cambia la password
            </button>
          </div>

          <button
            type="submit"
            disabled={!editMode}
            className={`w-full py-2 rounded-lg transition duration-300 shadow-lg ${
              editMode
                ? "bg-green-500/20 dark:bg-green-600/20 backdrop-blur-md hover:bg-green-500/30 dark:hover:bg-green-600/30 border border-green-400/30 dark:border-green-500/30 hover:border-green-400/50 text-green-600 dark:text-green-400 font-medium"
                : "bg-gray-300/50 backdrop-blur-sm border border-gray-200/50 text-gray-500 cursor-not-allowed"
            }`}
          >
            Salva modifiche
          </button>

          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            className="w-full text-sm bg-red-500/20 dark:bg-red-600/20 backdrop-blur-md px-4 py-2 transition-all hover:bg-red-500/30 dark:hover:bg-red-600/30 border border-red-400/30 dark:border-red-500/30 hover:border-red-400/50 rounded-lg mt-2 shadow-lg text-red-600 dark:text-red-400 font-medium"
          >
            Disattiva il mio account
          </button>
        </form>
      </div>

      <style>
        {`
          @keyframes wiggle {
            0% { transform: rotate(-5deg); }
            50% { transform: rotate(5deg); }
            100% { transform: rotate(-5deg); }
          }
        `}
      </style>
    </div>
  );
}
