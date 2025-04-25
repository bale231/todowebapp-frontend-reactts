// ✅ ResetPassword.tsx - pagina per reimpostare la password con animazioni GSAP
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import gsap from "gsap";
import { updatePassword } from "../api/auth";
import { Eye, EyeOff } from "lucide-react";

export default function ResetPassword() {
  const { uid, token } = useParams();
  const formRef = useRef(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [alert, setAlert] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error">("success");
  const navigate = useNavigate();

  useEffect(() => {
    gsap.fromTo(
      formRef.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
    );
  }, []);

  const showAlert = (message: string, type: "success" | "error") => {
    setAlert(message);
    setAlertType(type);
    if (!alertRef.current) return;

    gsap.killTweensOf(alertRef.current);
    gsap.set(alertRef.current, { autoAlpha: 0, x: 100 });

    gsap.to(alertRef.current, {
      autoAlpha: 1,
      x: 0,
      duration: 0.4,
      ease: "power2.out",
      onComplete: () => {
        setTimeout(() => {
          gsap.to(alertRef.current!, {
            autoAlpha: 0,
            x: 100,
            duration: 0.4,
            ease: "power2.in",
            onComplete: () => setAlert(""),
          });
        }, 3000);
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      showAlert("Le password non coincidono", "error");
      return;
    }

    const res = await updatePassword(uid || "", token || "", password);
    if (res.message === "Password aggiornata con successo") {
      showAlert("Password aggiornata! Reindirizzamento...", "success");
      setTimeout(() => navigate("/"), 2500);
    } else {
      showAlert(res.error || "Errore imprevisto", "error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
      <div
        ref={formRef}
        className="p-6 rounded-xl w-full max-w-sm"
      >
        <h2 className="text-2xl font-bold mb-4 text-center">
          Reimposta la password
        </h2>

        <div className="fixed top-4 right-4 z-50">
          <div
            ref={alertRef}
            style={{ opacity: 0 }}
            className={`px-4 py-2 rounded shadow-lg text-white font-medium absolute transition-all duration-300 ${
              alertType === "success" ? "bg-green-500" : "bg-red-500"
            }`}
          >
            {alert}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nuova password"
              className="w-full px-4 py-2 pr-10 rounded border dark:bg-gray-700 dark:text-white"
            />
            <span
              className="absolute right-3 top-2.5 cursor-pointer text-gray-500"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </span>
          </div>

          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Conferma password"
              className="w-full px-4 py-2 pr-10 rounded border dark:bg-gray-700 dark:text-white"
            />
            <span
              className="absolute right-3 top-2.5 cursor-pointer text-gray-500"
              onClick={() => setShowConfirm((prev) => !prev)}
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </span>
          </div>

          <button
            type="submit"
            className="w-full py-2 rounded bg-blue-600 hover:bg-blue-700 text-white transition"
          >
            Aggiorna Password
          </button>
        </form>
      </div>
    </div>
  );
}
