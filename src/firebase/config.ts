import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAxvwdmENvt6KZj-Jnlv7FtA9EZd_P-AC0",
  authDomain: "todo-webapp-e0ac5.firebaseapp.com",
  projectId: "todo-webapp-e0ac5",
  storageBucket: "todo-webapp-e0ac5.firebasestorage.app",
  messagingSenderId: "543071263999",
  appId: "1:543071263999:web:e798d5ff32778b055400ca",
  measurementId: "G-RH05EFGM9S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
const messaging = getMessaging(app);

export { messaging, getToken, onMessage };

// VAPID Key (chiave pubblica)
export const VAPID_KEY = "BIB5vGU4q2w-h73VflZwi2vfB3RNPybfssLD1vwFmaGOWYpyFnRibvpmyEaG3n5dtg-3eXgYNw8mFLSZ-8hLsmg";