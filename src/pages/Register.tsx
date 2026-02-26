// ✅ Register.tsx con controllo email e invio anche della mail
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../api/auth";
import gsap from "gsap";
import { Eye, EyeOff } from "lucide-react";
import { useNetwork } from "../context/NetworkContext";

export default function Register() {
  const navigate = useNavigate();
  const { isOnline } = useNetwork();

  const formRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");

  const [passwordValid, setPasswordValid] = useState(true);
  const [passwordMatch, setPasswordMatch] = useState(true);
  const [emailValid, setEmailValid] = useState(true);
  const [emailTouched, setEmailTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light');
    root.classList.add('dark');
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  
    if (formRef.current) {
      gsap.fromTo(
        formRef.current,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
      );
    }
  
    return () => {
      document.documentElement.classList.remove("dark"); // facoltativo: se vuoi rimuovere il dark dopo
    };
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
    if (logoRef.current) {
      gsap.fromTo(
        logoRef.current,
        { opacity: 0, y: -20, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "power2.out" }
      );
    }
  }, []);

  useEffect(() => {
    if (showModal && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 0.4, ease: "power2.out" }
      );
    }
  }, [showModal]);  

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
    setPasswordValid(
      password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password)
    );
    setPasswordMatch(password === confirmPassword);
    setEmailValid(email.includes("@"));
  }, [password, confirmPassword, email]);

  const handleRegister = async () => {
    if (!isOnline) {
      setError("Sei offline. La registrazione richiede una connessione internet.");
      return;
    }
    if (!passwordValid || !passwordMatch || !emailValid) {
      setError("Controlla i campi inseriti.");
      return;
    }

    try {
      const res = await register(username, email, password);

      // ✅ Controlla se la registrazione è andata a buon fine
      // Il backend ritorna: "Registrazione completata! Controlla la tua email per verificare l'account."
      if (res.message && res.message.includes("Registrazione completata")) {
        setError("");
        setShowModal(true); // ✅ Mostra la modale
      } else if (res.error?.includes("Username")) {
        setError("Username già esistente.");
      } else if (res.error?.includes("Email")) {
        setError("Email già registrata.");
      } else {
        setError("Errore nella registrazione.");
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      setError("Errore imprevisto, riprova.");
    }
  };  

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div
        ref={formRef}
        className="p-6 rounded-xl w-full max-w-sm"
      >
        <div className="flex justify-center w-full mb-6">
          <img
            ref={logoRef}
            src="./assets/logo-themedark.png"
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
            className="peer w-full px-4 pt-6 pb-2 border rounded text-sm text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder=" "
          />
          <label
            htmlFor="username"
            className="absolute left-4 top-2 text-sm text-gray-500 dark:text-gray-300 transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
          >
            Username
          </label>
        </div>

        <div className="relative w-full mb-4">
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setEmailTouched(true)}
            className="peer w-full px-4 pt-6 pb-2 border rounded text-sm text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder=" "
          />
          <label
            htmlFor="email"
            className="absolute left-4 top-2 text-sm text-gray-500 dark:text-gray-300 transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
          >
            Email
          </label>
          {!emailValid && emailTouched && (
            <p className="text-red-500 text-sm mt-1">
              Inserisci una email valida
            </p>
          )}
        </div>

        <div className="relative w-full mb-4">
          <input
            type={showPassword ? "text" : "password"}
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="peer w-full px-4 pt-6 pb-2 pr-10 border rounded text-sm text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder=" "
          />
          <label
            htmlFor="password"
            className="absolute left-4 top-2 text-sm text-gray-500 dark:text-gray-300 transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
          >
            Password
          </label>
          <span
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer text-gray-500"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </span>
          {!passwordValid && password.length > 0 && (
            <p className="text-red-500 text-sm mt-1">
              Almeno 8 caratteri, una maiuscola e un numero
            </p>
          )}
        </div>

        <div className="relative w-full mb-4">
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onFocus={() => setConfirmTouched(true)}
            className="peer w-full px-4 pt-6 pb-2 border rounded text-sm text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder=" "
          />
          <label
            htmlFor="confirmPassword"
            className="absolute left-4 top-2 text-sm text-gray-500 dark:text-gray-300 transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
          >
            Conferma Password
          </label>
          {!passwordMatch && confirmTouched && (
            <p className="text-red-500 text-sm mt-1">
              Le password non corrispondono
            </p>
          )}
        </div>
        <button
          onClick={handleRegister}
          className="w-full py-2 rounded border border-green-600 text-white bg-green-600 hover:bg-transparent hover:text-green-600 transition-colors duration-300"
        >
          Registrati
        </button>

        <p className="text-sm text-center mt-4 text-gray-700 dark:text-gray-300">
          Hai già un account?{" "}
          <Link to="/" className="text-blue-500 hover:underline">
            Accedi
          </Link>
        </p>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div ref={modalRef} className="bg-gray-900 text-white rounded-2xl shadow-xl p-6 w-[90%] max-w-md text-center">
            <h2 className="text-2xl font-bold mb-2">✅ Registrazione completata!</h2>
            <p className="mb-6">Conferma la mail per effettuare il login.</p>
            <button
              onClick={() => {
                setShowModal(false);
                navigate("/");
              }}
              className="bg-green-600 px-5 py-2 rounded-lg hover:bg-green-700 transition"
            >
              Ok
            </button>
          </div>
        </div>
      )}
    </div>
    
  );
}
