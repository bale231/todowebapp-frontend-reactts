import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import Navbar from "../components/Navbar";
import {
  getCurrentUserJWT,
  updateProfile,
  deactivateAccount,
} from "../api/auth";

export default function Profile() {
  const formRef = useRef(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [success, setSuccess] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error">("success");
  const [clearPicture, setClearPicture] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    const calcStrength = () => {
      if (!newPassword) return setPasswordStrength(0);

      let strength = 0;
      if (newPassword.length >= 8) strength += 1;
      if (/[A-Z]/.test(newPassword)) strength += 1;
      if (/[0-9]/.test(newPassword)) strength += 1;
      if (/[^A-Za-z0-9]/.test(newPassword)) strength += 1;

      setPasswordStrength(strength);
    };

    calcStrength();
  }, [newPassword]);

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

  const fetchUserData = async () => {
    const user = await getCurrentUserJWT();
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
      setAvatar(user.profile_picture);
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
    if (newPassword && newPassword !== confirmPassword) {
      showAlert("La nuova password e la conferma non coincidono", "error");
      return;
    }

    if (newPassword) {
      formData.append("old_password", oldPassword);
      formData.append("new_password", newPassword);
    }

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

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white relative overflow-hidden">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div
            ref={modalRef}
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-80"
          >
            <h3 className="text-lg font-semibold text-center mb-4">
              Conferma disattivazione
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 text-center mb-6">
              Sei sicuro di voler disattivare il tuo account?
            </p>
            <div className="flex justify-between">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Annulla
              </button>
              <button
                onClick={handleDeactivate}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto">
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="rounded-xl p-4 space-y-6"
        >
          <h2 className="text-2xl font-bold text-center">Profilo</h2>

          <div className="flex flex-col items-center gap-2">
            <label htmlFor="avatar">
              <div className="w-24 h-24 rounded-full bg-gray-300 dark:bg-gray-700 overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-300 flex items-center justify-center">
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
                className="flex items-center gap-2 text-xs text-white dark:text-white bg-red-600 px-4 py-2 border border-red-600 hover:bg-transparent transition-all rounded-[6px] group"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4 group-hover:rotate-[90deg] transition-transform duration-300"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Rimuovi immagine
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditMode((prev) => !prev)}
              className="text-xs text-white dark:text-white bg-blue-600 px-4 py-2 rounded-[6px] border border-blue-600 transition-all hover:bg-transparent flex items-center gap-2 group"
            >
              <span className="relative w-4 h-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4 absolute top-0 left-0 group-hover:animate-[wiggle_0.3s_ease-in-out_1]"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.862 4.487a2.25 2.25 0 113.182 3.182L7.5 20.213 3 21l.787-4.5L16.862 4.487z"
                  />
                </svg>
              </span>
              {editMode ? "Annulla modifica" : "Modifica profilo"}
            </button>
          </div>

          <div className="flex flex-col relative">
            <input
              id="username"
              type="text"
              disabled={!editMode}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="peer w-full px-4 pt-6 pb-2 rounded border dark:bg-gray-700 dark:text-white transition duration-300 focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
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
              className="peer w-full px-4 pt-6 pb-2 rounded border dark:bg-gray-700 dark:text-white transition duration-300 focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
              placeholder="Email"
            />
            <label
              htmlFor="email"
              className="absolute left-4 top-2 text-sm text-gray-500 dark:text-gray-300 transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
            >
              Email
            </label>
          </div>

          {!editMode ? (
            <div className="flex flex-col relative">
              <input
                id="password"
                type="password"
                disabled
                value="********"
                className="peer w-full px-4 pt-6 pb-2 rounded border dark:bg-gray-700 dark:text-white transition duration-300"
              />
              <label
                htmlFor="password"
                className="absolute left-4 top-2 text-sm text-gray-500 dark:text-gray-300"
              >
                Password
              </label>
            </div>
          ) : (
            <>
              <div className="flex flex-col relative">
                <input
                  type="password"
                  placeholder="Vecchia password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="peer w-full px-4 pt-6 pb-2 rounded border dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                <label className="absolute left-4 top-2 text-sm text-gray-500 dark:text-gray-300">
                  Vecchia password
                </label>
              </div>

              <div className="flex flex-col relative">
                <input
                  type="password"
                  placeholder="Nuova password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="peer w-full px-4 pt-6 pb-2 rounded border dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                <div className="mt-2 h-2 w-full bg-gray-300 rounded">
                  <div
                    className="h-full rounded transition-all duration-300"
                    ref={(el) => {
                      if (el) {
                        const width = ["0%", "33%", "66%", "100%"][
                          passwordStrength
                        ];
                        const color = [
                          "#DC2626",
                          "#FACC15",
                          "#22C55E",
                          "#16A34A",
                        ][passwordStrength];

                        gsap.to(el, {
                          width,
                          backgroundColor: color,
                          duration: 0.5,
                          ease: "power2.out",
                        });
                      }
                    }}
                  />
                </div>
                <label className="absolute left-4 top-2 text-sm text-gray-500 dark:text-gray-300">
                  Nuova password
                </label>
              </div>

              <div className="flex flex-col relative">
                <input
                  type="password"
                  placeholder="Conferma nuova password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="peer w-full px-4 pt-6 pb-2 rounded border dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                <label className="absolute left-4 top-2 text-sm text-gray-500 dark:text-gray-300">
                  Conferma password
                </label>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={!editMode}
            className={`w-full py-2 rounded border transition duration-300 ${
              editMode
                ? "bg-green-600 hover:bg-transparent border-green-600 text-white hover:text-green-600"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            Salva modifiche
          </button>

          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            className="w-full text-sm text-white dark:text-white bg-red-600 px-4 py-2 transition-all hover:bg-transparent border border-red-600 rounded-[6px] mt-2"
          >
            Disattiva il mio account
          </button>
        </form>
      </div>
    </div>
  );
}
