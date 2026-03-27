import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

const Login = lazy(() => import('@/pages/auth/Login'))
const Register = lazy(() => import('@/pages/auth/Register'))
const Onboarding = lazy(() => import('@/pages/onboarding/Onboarding'))
const Dashboard = lazy(() => import('@/pages/dashboard/Dashboard'))
const Home = lazy(() => import('@/pages/home/Home'))
const Ideas = lazy(() => import('@/pages/ideas/Ideas'))
const NewIdea = lazy(() => import('@/pages/ideas/NewIdea'))
const IdeaPublic = lazy(() => import('@/pages/ideas/IdeaPublic'))
const Profile = lazy(() => import('@/pages/profile/Profile'))
const Feed = lazy(() => import('@/pages/feed/Feed'))

function PublicRoute({ children }: { children: ReactNode }) {
  const user = useAuthStore(s => s.user)
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function PrivateRoute({
  children,
  skipOnboardingCheck = false,
}: {
  children: ReactNode
  skipOnboardingCheck?: boolean
}) {
  const user = useAuthStore(s => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (!skipOnboardingCheck && user.sectors.length === 0)
    return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-screen bg-[#FAFAF8]" />}>
        <Routes>
          <Route
            path="/"
            element={
              <PublicRoute>
                <Home />
              </PublicRoute>
            }
          />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />
          <Route
            path="/onboarding"
            element={
              <PrivateRoute skipOnboardingCheck>
                <Onboarding />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/ideas"
            element={
              <PrivateRoute>
                <Ideas />
              </PrivateRoute>
            }
          />
          <Route
            path="/ideas/new"
            element={
              <PrivateRoute>
                <NewIdea />
              </PrivateRoute>
            }
          />
          <Route path="/flashcard/:id" element={<IdeaPublic />} />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />
          <Route
            path="/feed"
            element={
              <PrivateRoute>
                <Feed />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
