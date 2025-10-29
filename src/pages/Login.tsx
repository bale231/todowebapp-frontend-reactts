import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login, getCurrentUserJWT } from "../api/auth";
import gsap from "gsap";
import { Eye, EyeOff, User, AtSign } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const navigate = useNavigate();
  const [loginMode, setLoginMode] = useState<'username'|'email'>('username');
  const labelFlipRef = useRef<HTMLSpanElement>(null);

  // forzo tema chiaro alla pagina di login
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
  }, []);

  // piccola animazione quando cambi modalità
  useEffect(() => {
    if (!labelFlipRef.current) return;
    gsap.to(labelFlipRef.current, {
      rotateY: 90, duration: 0.15, ease: 'power1.in',
      onComplete: () => {
        gsap.set(labelFlipRef.current, { rotateY: -90 });
        gsap.to(labelFlipRef.current, { rotateY: 0, duration: 0.15, ease: 'power1.out' });
      }
    });
  }, [loginMode]);

  useEffect(() => {
    const checkAlreadyLoggedIn = async () => {
      const user = await getCurrentUserJWT();
      if (user) {
        navigate("/home");
      }
    };
    checkAlreadyLoggedIn();
  }, [navigate]);
  
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
    if (error && errorRef.current) {
      gsap.fromTo(
        errorRef.current,
        { opacity: 0, x: 100 },
        { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" }
      );
    }
  }, [error]);

  useEffect(() => {
    if (logoRef.current) {
      gsap.fromTo(
        logoRef.current,
        { opacity: 0, y: -20, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "power2.out" }
      );
    }
  }, []);

  // Funzione di gestione del login
  const handleLogin = async () => {
    setIsLoading(true);
    setError("");

    const result = await login(username, password, rememberMe); // Passa rememberMe

    if (result.success) {
      const { accessToken, refreshToken } = result;
      const storage = rememberMe ? localStorage : sessionStorage;

      storage.setItem("accessToken", accessToken);
      storage.setItem("refreshToken", refreshToken);

      const user = await getCurrentUserJWT();
      if (user) {
        document.body.setAttribute("data-access-token", result.accessToken);
        navigate("/home");
      } else {
        setError("Errore nel recupero dati utente");
      }
    } else {
      // ✅ Gestisci messaggio email non verificata
      console.log("Login failed. Message received:", result.message); // Debug
      // Controlla varie versioni del messaggio (email not verified, email_not_verified, email_not_verifyed)
      if (result.message && result.message.toLowerCase().includes("email") && result.message.toLowerCase().includes("verif")) {
        setError("Verifica l'email prima di registrarti!");
      } else {
        setError(result.message || "Credenziali non valide");
      }
    }

    setIsLoading(false);
  };
  

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div ref={formRef} className="p-6 rounded-xl w-full max-w-sm">
        <div className="flex justify-center w-full mb-6">
          <img
            ref={logoRef}
            src="https://webdesign-vito-luigi.it/appIcon/logo-themelight.png"
            alt="ToDoApp Logo"
            width={270}
            className="transition-opacity duration-500 ease-in-out text-center"
          />
        </div>

        {error && (
          <div
            ref={errorRef}
            className={`px-4 py-2 rounded mb-4 text-sm border ${
              error === "Verifica l'email prima di registrarti!"
                ? "bg-orange-100 text-orange-700 border-orange-400"
                : "bg-red-100 text-red-700 border-red-400"
            }`}
          >
            {error}
          </div>
        )}

        <div className="mb-4">
          <span className="block text-xs font-medium text-gray-500 mb-2">
            Accedi con
          </span>
          <div className="inline-flex w-full bg-gray-200 dark:bg-gray-700 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setLoginMode('username')}
              aria-pressed={loginMode === 'username'}
              className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition
                ${loginMode === 'username'
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow'
                  : 'text-gray-700 dark:text-gray-300'}`}
            >
              <User size={16} />
              <span className="text-sm font-medium">Username</span>
            </button>
            <button
              type="button"
              onClick={() => setLoginMode('email')}
              aria-pressed={loginMode === 'email'}
              className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition
                ${loginMode === 'email'
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow'
                  : 'text-gray-700 dark:text-gray-300'}`}
            >
              <AtSign size={16} />
              <span className="text-sm font-medium">Email</span>
            </button>
          </div>
        </div>
        
        <div className="relative w-full mb-4">
          <input
            id="identifier"
            type={loginMode === 'email' ? 'email' : 'text'}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="peer w-full px-4 pt-6 pb-2 border rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder=" "
            autoComplete={loginMode === 'email' ? 'email' : 'username'}
            inputMode={loginMode === 'email' ? 'email' : 'text'}
          />
          <label
            htmlFor="identifier"
            className="absolute left-4 top-2 text-sm text-gray-500 transition-all duration-200
                      peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400
                      peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <span ref={labelFlipRef} style={{ display: 'inline-block' }}>
              {loginMode === 'email' ? 'Email' : 'Username'}
            </span>
          </label>
        </div>

        <div className="relative w-full mb-4">
          <input
            type={showPassword ? "text" : "password"}
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="peer w-full px-4 pt-6 pb-2 pr-10 border rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder=" "
          />
          <label
            htmlFor="password"
            className="absolute left-4 top-2 text-sm text-gray-500 transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
          >
            Password
          </label>
          <span
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer text-gray-500"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </span>
        </div>

        {/* Ricordami */}
        <div className="flex items-center mb-4">
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <div
              className="
                w-6 h-6 border-2 border-gray-300 rounded-md bg-white
                dark:bg-gray-800 relative transition-all duration-200 ease-out
                peer-checked:border-blue-600 peer-checked:bg-blue-600
                peer-focus:ring-2 peer-focus:ring-blue-300
              "
            >
              <svg
                className="
                  absolute inset-0 m-auto w-4 h-4 text-white opacity-0 scale-50
                  transition-all duration-150 ease-out
                  peer-checked:opacity-100 peer-checked:scale-100
                "
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span className="ml-2 text-gray-700 dark:text-gray-300 text-sm">
              Rimani loggato
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          onClick={handleLogin}
          className={`w-full py-2 rounded ${
            isLoading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          } text-white font-semibold`}
        >
          {isLoading ? "Attendi..." : "Accedi"}
        </button>

        <p className="text-sm text-center mt-4 text-gray-700">
          Non hai un account?{" "}
          <Link to="/register" className="text-blue-500 hover:underline">
            Registrati
          </Link>
        </p>
      </div>
    </div>
  );
}
