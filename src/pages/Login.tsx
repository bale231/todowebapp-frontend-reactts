import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login, getCurrentUserJWT } from "../api/auth";
import gsap from "gsap";
import { Eye, EyeOff } from "lucide-react";

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

  const handleLogin = async () => {
    setIsLoading(true);
    setError("");
  
    const result = await login(username, password);
  
    if (result.success) {
      const user = await getCurrentUserJWT();
      if (user) {
        // se rememberMe=true, usa localStorage, altrimenti sessionStorage
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem("accessToken", result.accessToken);
        storage.setItem("refreshToken", result.refreshToken);
  
        document.body.setAttribute("data-access-token", result.accessToken);
        navigate("/home");
      } else {
        setError("Errore nel recupero dati utente");
      }
    } else {
      setError(result.message);
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
            className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4 text-sm border border-red-400"
          >
            {error}
          </div>
        )}

        <div className="relative w-full mb-4">
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="peer w-full px-4 pt-6 pb-2 border rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder=" "
          />
          <label
            htmlFor="username"
            className="absolute left-4 top-2 text-sm text-gray-500 transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
          >
            Username
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
