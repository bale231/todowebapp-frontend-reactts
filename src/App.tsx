import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import Profile from './pages/Profile'
import ResetPassword from './pages/ResetPassword'
import VerifyEmail from './pages/VerifyEmail'
import ToDoListPage from './pages/ToDoListPage'
import LoginRedirect from './components/LoginRedirect'

function App() {

  const isLoggedIn = !!localStorage.getItem("jwt");

  return (
    <Router>
      <Routes>
        <Route path="/profile" element={<Profile />} /> {/* 👈 qui */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
        <Route path="/verify-email/:uid/:token" element={<VerifyEmail />} />
        <Route path="/lists/:id" element={<ToDoListPage />} />
        <Route path="/login-success" element={<LoginRedirect />} />
        <Route path="/home" element={<Home />} />
        <Route
          path="/"
          element={isLoggedIn ? <Navigate to="/home" /> : <Navigate to="/login" />}
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  )
}

export default App
