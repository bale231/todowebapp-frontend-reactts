import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function VerifyEmail() {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"pending" | "success" | "error">(
    "pending"
  );

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/api/verify-email/${uid}/${token}/`
        );
        const data = await res.json();
        if (data.verified) {
          setStatus("success");
          setTimeout(() => navigate("/login"), 3000);
        } else {
          setStatus("error");
        }
      } catch (err) {
        setStatus("error");
      }
    };
    verify();
  }, [uid, token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-center">
      <div className="bg-white dark:bg-gray-800 p-8 rounded shadow-md max-w-md">
        {status === "pending" && (
          <p className="text-blue-500 font-semibold">Verifica in corso...</p>
        )}
        {status === "success" && (
          <p className="text-green-600 font-semibold">
            ✅ Email verificata con successo! Verrai reindirizzato al login.
          </p>
        )}
        {status === "error" && (
          <p className="text-red-600 font-semibold">
            ❌ Verifica fallita. Link non valido o già usato.
          </p>
        )}
      </div>
    </div>
  );
}
