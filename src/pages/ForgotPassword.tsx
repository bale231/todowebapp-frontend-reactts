import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { CheckCircle, Mail, ArrowLeft } from "lucide-react";
import { useNetwork } from "../context/NetworkContext";

export default function ForgotPassword() {
  const { isOnline } = useNetwork();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  // forzo tema chiaro alla pagina di forgot password
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
  }, []);

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

  useEffect(() => {
    if (error && errorRef.current) {
      gsap.fromTo(
        errorRef.current,
        { opacity: 0, x: 100 },
        { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" }
      );
      // Auto-dismiss after 4 seconds
      const timer = setTimeout(() => setError(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success && successRef.current) {
      // Animazione del contenitore
      gsap.fromTo(
        successRef.current,
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.7)" }
      );

      // Animazione del visto verde
      const checkIcon = successRef.current.querySelector('.check-icon');
      if (checkIcon) {
        gsap.fromTo(
          checkIcon,
          { scale: 0, rotation: -180 },
          { scale: 1, rotation: 0, duration: 0.6, ease: "elastic.out(1, 0.5)", delay: 0.2 }
        );
      }
    }
  }, [success]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isOnline) {
      setError("Sei offline. Questa operazione richiede una connessione internet.");
      return;
    }

    setIsLoading(true);
    setError("");

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
        setSuccess(true);
      } else {
        // Gestione errori specifici
        const lowerMessage = (data.message || "").toLowerCase();

        if (lowerMessage.includes("email") &&
            (lowerMessage.includes("not found") ||
             lowerMessage.includes("non trovata") ||
             lowerMessage.includes("not exist") ||
             lowerMessage.includes("non esiste") ||
             lowerMessage.includes("invalid"))) {
          setError("Email non registrata, ritenta con un email corretta.");
        } else {
          setError(data.message || "Errore nell'invio dell'email");
        }
      }
    } catch (error) {
      setError("Errore di connessione");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div ref={successRef} className="p-6 rounded-xl w-full max-w-sm">
          <div className="bg-white rounded-xl p-8 shadow-lg text-center">
            <div className="flex justify-center mb-6">
              <div className="check-icon p-4 bg-green-100 rounded-full">
                <CheckCircle size={64} className="text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              Email inviata!
            </h2>
            <p className="text-gray-700 mb-2">
              Controlla la tua casella di posta!
            </p>
            <p className="text-sm text-gray-600 mb-6">
              Ti abbiamo inviato un link per reimpostare la tua password.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-blue-600 hover:underline"
            >
              <ArrowLeft size={16} />
              Torna al login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div ref={formRef} className="p-6 rounded-xl w-full max-w-sm">
        <div className="flex justify-center w-full mb-6">
          <img
            ref={logoRef}
            src="./assets/logo-themelight.png"
            alt="ToDoApp Logo"
            width={270}
            className="transition-opacity duration-500 ease-in-out text-center"
          />
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Mail size={24} className="text-blue-600" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center mb-2 text-gray-900">
            Password dimenticata?
          </h2>
          <p className="text-sm text-gray-600 text-center mb-6">
            Inserisci la tua email e ti invieremo un link per reimpostare la password.
          </p>

          {error && (
            <div
              ref={errorRef}
              className="px-4 py-2 rounded mb-4 text-sm border bg-red-100 text-red-700 border-red-400"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="relative w-full mb-6">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="peer w-full px-4 pt-6 pb-2 border rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder=" "
                required
                autoComplete="email"
              />
              <label
                htmlFor="email"
                className="absolute left-4 top-2 text-sm text-gray-500 transition-all duration-200
                          peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400
                          peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
              >
                Email
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2 rounded ${
                isLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              } text-white font-semibold mb-4`}
            >
              {isLoading ? "Invio in corso..." : "Invia email di reset"}
            </button>

            <Link
              to="/"
              className="flex items-center justify-center gap-2 text-sm text-gray-700 hover:text-blue-600"
            >
              <ArrowLeft size={16} />
              Torna al login
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}
