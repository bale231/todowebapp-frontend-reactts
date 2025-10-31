import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import Profile from './pages/Profile'
import ResetPassword from './pages/ResetPassword'
import ForgotPassword from './pages/ForgotPassword'
import VerifyEmail from './pages/VerifyEmail'
import ToDoListPage from './pages/ToDoListPage'
import LoginRedirect from './components/LoginRedirect'
import { ThemeProvider } from './context/ThemeContext'
import { NotificationProvider } from './context/NotificationContext'
import NotificationPopup from './components/NotificationPopup'
import VersionChecker from './components/VersionChecker'
import UsersPage from './pages/UsersPage'
import FriendsPage from './pages/FriendsPage'
import FriendRequestsPage from './pages/FriendRequestsPage'

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
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
            <Route path="/verify-email/:uid/:token" element={<VerifyEmail />} />
            <Route path="/lists/:id" element={<ToDoListPage />} />
            <Route path="/login-success" element={<LoginRedirect />} />
            <Route path="/home" element={<Home />} />
            <Route path="*" element={<Navigate to="/" />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/friend-requests" element={<FriendRequestsPage />} />
          </Routes>
          <NotificationPopup />
        </NotificationProvider>
      </ThemeProvider>
    </Router>
  )
}

export default App
