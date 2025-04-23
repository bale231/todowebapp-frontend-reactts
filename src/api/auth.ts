// ✅ src/api/auth.ts
const API_URL = "https://bale231.pythonanywhere.com/api";

// Login JWT
export async function loginJWT(username: string, password: string) {
  const res = await fetch(`${API_URL}/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  if (res.ok) {
    localStorage.setItem("access", data.access);
    localStorage.setItem("refresh", data.refresh);
  }
  return data;
}

export async function getCurrentUserJWT() {
  const token = localStorage.getItem("access");
  if (!token) return null;

  const res = await fetch("https://bale231.pythonanywhere.com/api/user/", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.ok) return await res.json();
  return null;
}


// Login
export async function login(username: string, password: string) {
  const res = await fetch("https://bale231.pythonanywhere.com/api/token/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();

  if (res.ok) {
    // salva il token
    localStorage.setItem("access", data.access);
    localStorage.setItem("refresh", data.refresh);
    return { success: true };
  } else {
    return { success: false, message: data.detail || "Errore di login" };
  }
}

// Register
export const register = async (
  username: string,
  email: string,
  password: string
) => {
  const res = await fetch(`${API_URL}/register/`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  return res.json();
};

// Logout
export async function logout() {
  await fetch(`${API_URL}/logout/`, {
    method: "POST",
    credentials: "include",
  });
}

// Get current user
export async function getCurrentUser() {
  try {
    const res = await fetch(`${API_URL}/user/`, {
      credentials: "include",
    });

    if (res.status === 401) return null;

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Errore nel recupero utente:", error);
    return null;
  }
}

// Update profile
export const updateProfile = async (formData: FormData) => {
  const res = await fetch(`${API_URL}/update-profile/`, {
    method: "POST",
    credentials: "include",
    body: formData, // 👈 NON devi mettere headers se usi FormData!
  });
  return await res.json();
};


// Send reset password email
export const resetPassword = async () => {
  const res = await fetch(`${API_URL}/reset-password/`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return res.json();
};

// Update password from reset
export const updatePassword = async (
  uid: string,
  token: string,
  newPassword: string
) => {
  const res = await fetch(`${API_URL}/reset-password/${uid}/${token}/`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: newPassword }),
  });
  return res.json();
};

// Send email verification
export const sendVerificationEmail = async () => {
  const res = await fetch(`${API_URL}/send-verification-email/`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return res.json();
};

// Elimina account
export const deactivateAccount = async () => {
  const res = await fetch(`${API_URL}/delete-account/`, {
    method: "DELETE", // cambiato da POST a DELETE
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return res.json();
};


// Update theme
export const updateTheme = async (theme: string) => {
  const res = await fetch(`${API_URL}/update-theme/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ theme }),
  });
  return res.json();
};