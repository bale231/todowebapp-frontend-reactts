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
import VersionChecker from './components/VersionChecker'

function App() {

  return (
    <Router>
      <ThemeProvider>
        <NotificationProvider>
          <VersionChecker />
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
