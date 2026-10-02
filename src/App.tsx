import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { GuestRoute, ProtectedRoute } from './auth/guards'
import { ToastProvider } from './components/Toast'
import { Login } from './pages/auth/Login'
import { Home } from './pages/Home'
import { Showcase } from './pages/Showcase'

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<GuestRoute />}>
              <Route path="/login" element={<Login />} />
            </Route>
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Home />} />
            </Route>
            {/* Витрина компонентов, только в режиме разработки. */}
            {import.meta.env.DEV && <Route path="/dev" element={<Showcase />} />}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  )
}
