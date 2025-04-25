import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    // Verifica che il login abbia funzionato
    fetch("https://bale231.pythonanywhere.com/api/user/", {
      credentials: "include",
    })
      .then((res) => {
        if (res.ok) {
          navigate("/home"); // 👈 vai alla home
        } else {
          navigate("/"); // 👈 torna al login se non sei loggato
        }
      })
      .catch(() => navigate("/"));
  }, [navigate]);

  return (
    <div className="h-screen flex items-center justify-center text-lg">
      Caricamento in corso...
    </div>
  );
}
