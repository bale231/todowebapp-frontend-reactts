import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import Profile from './pages/Profile'
import ResetPassword from './pages/ResetPassword'
import VerifyEmail from './pages/VerifyEmail'
import ToDoListPage from './pages/ToDoListPage'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/profile" element={<Profile />} /> {/* 👈 qui */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
        <Route path="/verify-email/:uid/:token" element={<VerifyEmail />} />
        <Route path="/lists/:id" element={<ToDoListPage />} />
        <Route path="/" element={< Home /> } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  )
}

export default App
