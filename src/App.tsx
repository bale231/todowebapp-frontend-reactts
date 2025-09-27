import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import Profile from './pages/Profile'
import ResetPassword from './pages/ResetPassword'
import VerifyEmail from './pages/VerifyEmail'
import ToDoListPage from './pages/ToDoListPage'
import LoginRedirect from './components/LoginRedirect'
import { ThemeProvider } from './context/ThemeContext'
import { NotificationProvider } from './context/NotificationContext'
import NotificationPopup from './components/NotificationPopup'
import { useEffect } from 'react'

function App() {
  // Controllo versione app
  useEffect(() => {
    const checkVersion = async () => {
      try {
        const res = await fetch('/version.json?t=' + Date.now(), { 
          cache: 'no-store' 
        });
        
        if (!res.ok) return;
        
        const data = await res.json();
        const current = localStorage.getItem('app_version') || '1.0.0';
        
        if (data.version !== current) {
          localStorage.setItem('app_version', data.version);
          
          const msg = data.type === 'important' 
            ? 'Elimina e reinserisci il segnalibro dalla home!' 
            : 'Chiudi e riapri l\'app per aggiornare!';
          
          alert(`Nuova versione ${data.version}: ${msg}`);
          
          // 🔔 CREA NOTIFICA IN-APP
          const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
          
          if (token) {
            try {
              await fetch('https://bale231.pythonanywhere.com/api/notifications/update/', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  version: data.version,
                  type: data.type,
                  message: data.message
                })
              });
              console.log('✅ Notifica in-app creata');
            } catch (error) {
              console.error('❌ Errore creazione notifica:', error);
            }
          }
        }
      } catch (err) {
        console.error('Errore check versione:', err);
      }
    };
    
    checkVersion();
    const interval = setInterval(checkVersion, 120000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Router>
      <ThemeProvider>
        <NotificationProvider>
          <Routes>
            <Route path="/profile" element={<Profile />} />
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
            <Route path="/verify-email/:uid/:token" element={<VerifyEmail />} />
            <Route path="/lists/:id" element={<ToDoListPage />} />
            <Route path="/login-success" element={<LoginRedirect />} />
            <Route path="/home" element={<Home />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          <NotificationPopup />
        </NotificationProvider>
      </ThemeProvider>
    </Router>
  )
}

export default App
