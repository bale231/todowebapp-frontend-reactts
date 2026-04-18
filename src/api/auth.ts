// ✅ src/api/auth.ts
const API_URL = "https://bale231.pythonanywhere.com/api";

// 🔐 Funzione login con JWT
export const login = async (username: string, password: string, rememberMe: boolean = false) => {
  try {
    const response = await fetch(`${API_URL}/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password,
        remember_me: rememberMe  // Invia il flag
      }),
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        accessToken: data.access,
        refreshToken: data.refresh,
        user: data.user,
        rememberMe: data.remember_me
      };
    }

    // ✅ Gestisci errori specifici
    console.log("Login failed with status:", response.status, "message:", data.message);
    return { success: false, message: data.message || "Invalid credentials" };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return { success: false, message: "Errore di connessione" };
  }
};

// Singleton refresh: only one refresh at a time, concurrent callers share the promise
let _refreshPromise: Promise<string | null> | null = null;

export async function refreshTokenIfNeeded(): Promise<string | null> {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    const refresh =
      sessionStorage.getItem("refreshToken") ||
      localStorage.getItem("refreshToken");

    if (!refresh) return null;

    try {
      const res = await fetch(`${API_URL}/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });

      if (!res.ok) return null;

      const data = await res.json();

      const storage =
        sessionStorage.getItem("refreshToken") !== null
          ? sessionStorage
          : localStorage;

      storage.setItem("accessToken", data.access);
      // Save new refresh token if backend uses token rotation
      if (data.refresh) storage.setItem("refreshToken", data.refresh);

      return data.access;
    } catch (err) {
      console.error("Errore nel refresh del token:", err);
      return null;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}

/**
 * Proactively refresh the access token if it expires within 24 hours.
 * Call this on every app startup to implement sliding expiry:
 * each time the user opens the app, the 30-day refresh window resets.
 */
export async function proactiveTokenRefresh(): Promise<void> {
  const token =
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("accessToken");

  if (!token) return;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const expiresAt = payload.exp * 1000;
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    // Refresh if expired or expiring within 24 hours
    if (expiresAt - now < twentyFourHours) {
      await refreshTokenIfNeeded();
    }
  } catch {
    // Malformed token - ignore, 401 will handle it
  }
}

// 🔐 Recupero utente corrente tramite JWT
export async function getCurrentUserJWT() {
  let token =
    sessionStorage.getItem("accessToken") ||
    localStorage.getItem("accessToken");

  if (!token) return null;

  let res = await fetch(`${API_URL}/jwt-user/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401) {
    console.warn("🔁 Token scaduto, provo a rinnovarlo...");
    const newToken = await refreshTokenIfNeeded();

    if (!newToken) return null;

    token = newToken;
    res = await fetch(`${API_URL}/jwt-user/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  if (!res.ok) return null;

  const data = await res.json();
  console.log("👤 Utente JWT:", data);
  return data;
}

// 🔄 Logout locale
export function logout() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  sessionStorage.removeItem("accessToken");
  sessionStorage.removeItem("refreshToken");
  localStorage.removeItem("theme");

  // Pulisce dati offline (import dinamico per non creare dipendenza circolare)
  import("../db/database").then(({ clearAllLocalData }) => clearAllLocalData()).catch(() => {});
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
  const res = await fetch(`${API_URL}/update-profile-jwt/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken") || ""}`,
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
      Authorization: `Bearer ${localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken") || ""}`,
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
      Authorization: `Bearer ${localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken") || ""}`,
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
      Authorization: `Bearer ${localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken") || ""}`,
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
      Authorization: `Bearer ${localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken") || ""}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ theme }),
  });
  return res.json();
};

// 🔔 Aggiorna preferenze notifiche push
export const updateNotificationPreferences = async (pushEnabled: boolean) => {
  try {
    const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken") || "";
    console.log("Token usato:", token ? "presente" : "assente");
    console.log("Invio richiesta PATCH a:", `${API_URL}/notifications/preferences/`);
    console.log("Body:", { push_notifications_enabled: pushEnabled });

    const res = await fetch(`${API_URL}/notifications/preferences/`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ push_notifications_enabled: pushEnabled }),
    });

    console.log("Status risposta:", res.status);

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Errore risposta:", errorText);
      return { error: `HTTP ${res.status}`, message: errorText };
    }

    const data = await res.json();
    console.log("Dati risposta:", data);
    return data;
  } catch (error) {
    console.error("Errore fetch:", error);
    return { error: "Network error", message: String(error) };
  }
};