// ✅ src/api/auth.ts
const API_URL = "https://bale231.pythonanywhere.com/api";

// 🔐 Funzione login con JWT
export async function login(username: string, password: string) {
  try {
    const res = await fetch(`${API_URL}/token/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      return { success: false, message: data.message || "Credenziali errate" };
    }

    const data = await res.json();
    localStorage.setItem("accessToken", data.access);
    localStorage.setItem("refreshToken", data.refresh);

    return { success: true };
  } catch (err) {
    return { success: false, message: "Errore di rete: " + err };
  }
}

// 🔐 Recupero utente corrente tramite JWT
export async function getCurrentUserJWT() {
  const token = localStorage.getItem("accessToken");
  if (!token) return null;

  try {
    const res = await fetch(`${API_URL}/jwt-user/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    console.log("👤 User from JWT:", data);
    return data;
  } catch (err) {
    console.error("Errore nel recupero dell'utente:", err);
    return null;
  }
}

// 🔄 Logout locale
export function logout() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

// 📝 Register
export const register = async (username: string, email: string, password: string) => {
  const res = await fetch(`${API_URL}/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });

  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    return { error: "Server error", html: text };
  }
};

// 🧑‍💻 Update profile
export const updateProfile = async (formData: FormData) => {
  const res = await fetch(`${API_URL}/update-profile/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
    },
    body: formData,
  });
  return res.json();
};

// 🔐 Invia reset password
export const resetPassword = async () => {
  const res = await fetch(`${API_URL}/reset-password/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
      "Content-Type": "application/json",
    },
  });
  return res.json();
};

// 🔐 Aggiorna password da token
export const updatePassword = async (
  uid: string,
  token: string,
  newPassword: string
) => {
  const res = await fetch(`${API_URL}/reset-password/${uid}/${token}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: newPassword }),
  });
  return res.json();
};

// 📧 Verifica email
export const sendVerificationEmail = async () => {
  const res = await fetch(`${API_URL}/send-verification-email/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
      "Content-Type": "application/json",
    },
  });
  return res.json();
};

// ❌ Elimina account
export const deactivateAccount = async () => {
  const res = await fetch(`${API_URL}/delete-account/`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
      "Content-Type": "application/json",
    },
  });
  return res.json();
};

// 🎨 Cambia tema
export const updateTheme = async (theme: string) => {
  const res = await fetch(`${API_URL}/update-theme/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ theme }),
  });
  return res.json();
};
