import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import gsap from "gsap";
import { CheckCircle, XCircle, Key } from "lucide-react";
import { useNetwork } from "../context/NetworkContext";

export default function ResetPassword() {
  const { uid, token } = useParams<{ uid: string; token: string }>();
  const navigate = useNavigate();
  const { isOnline } = useNetwork();
  const formRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
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
    if (formRef.current) {
      gsap.fromTo(
        formRef.current,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
      );
    }
  }, []);

  useEffect(() => {
    if (logoRef.current) {
      gsap.fromTo(
        logoRef.current,
        { opacity: 0, y: -20, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "power2.out" }
      );
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isOnline) {
      setError("Sei offline. Questa operazione richiede una connessione internet.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Le password non coincidono");
      return;
    }

    if (passwordStrength < 2) {
      setError("La password deve essere più forte (minimo 8 caratteri, con maiuscole e numeri)");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`https://bale231.pythonanywhere.com/api/password-reset/confirm/${uid}/${token}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ new_password: newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);

        // ✅ Logout automatico: rimuovi tutti i token
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        sessionStorage.removeItem("accessToken");
        sessionStorage.removeItem("refreshToken");

        // ✅ Redirect al login dopo 3 secondi
        setTimeout(() => {
          navigate("/");
        }, 3000);
      } else {
        setError(data.message || "Errore durante il reset della password");
      }
    } catch (error) {
      setError("Errore di connessione");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="p-6 rounded-xl w-full max-w-sm text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-green-100 rounded-full">
              <CheckCircle size={48} className="text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900">Password resettata!</h2>
          <p className="text-gray-700 mb-4">
            La tua password è stata modificata con successo.
          </p>
          <p className="text-sm text-gray-600">
            Verrai reindirizzato alla pagina di login tra pochi secondi...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div ref={formRef} className="p-6 rounded-xl w-full max-w-sm">
        <div className="flex justify-center w-full mb-6">
          <img
            ref={logoRef}
            src="/assets/logo-themelight.png"
            alt="ToDoApp Logo"
            width={270}
            className="transition-opacity duration-500 ease-in-out text-center"
          />
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Key size={24} className="text-blue-600" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center mb-2 text-gray-900">
            Reset Password
          </h2>
          <p className="text-sm text-gray-600 text-center mb-6">
            Inserisci la tua nuova password
          </p>

          {error && (
            <div className="mb-4 px-4 py-2 bg-red-100 text-red-700 border border-red-400 rounded text-sm flex items-center gap-2">
              <XCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type="password"
                id="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="peer w-full px-4 pt-6 pb-2 border rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder=" "
                required
              />
              <label
                htmlFor="new-password"
                className="absolute left-4 top-2 text-sm text-gray-500 transition-all duration-200
                          peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400
                          peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
              >
                Nuova Password
              </label>

              {/* Password Strength Bar */}
              <div className="mt-2 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: ["0%", "25%", "50%", "75%", "100%"][passwordStrength],
                    backgroundColor: ["#DC2626", "#F59E0B", "#FACC15", "#22C55E", "#16A34A"][passwordStrength],
                  }}
                />
              </div>
            </div>

            <div className="relative">
              <input
                type="password"
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="peer w-full px-4 pt-6 pb-2 border rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder=" "
                required
              />
              <label
                htmlFor="confirm-password"
                className="absolute left-4 top-2 text-sm text-gray-500 transition-all duration-200
                          peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400
                          peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
              >
                Conferma Password
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 rounded-lg font-semibold transition ${
                isLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {isLoading ? "Attendi..." : "Resetta Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
