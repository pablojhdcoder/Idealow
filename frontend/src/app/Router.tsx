import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Skeleton } from '@/components/ui/skeleton'
import { APP_PAGE_WIDTH_CLASS } from '@/lib/appPageLayout'
import { cn } from '@/lib/utils'
import { peekPostAuthReturn, sanitizePostAuthReturnPath } from '@/lib/postAuthRedirect'

const Login = lazy(() => import('@/pages/auth/Login'))
const Register = lazy(() => import('@/pages/auth/Register'))
const Onboarding = lazy(() => import('@/pages/onboarding/Onboarding'))
const Dashboard = lazy(() => import('@/pages/dashboard/Dashboard'))
const Home = lazy(() => import('@/pages/home/Home'))
const Ideas = lazy(() => import('@/pages/ideas/Ideas'))
const NewIdea = lazy(() => import('@/pages/ideas/NewIdea'))
const IdeaDetail = lazy(() => import('@/pages/ideas/IdeaDetail'))
const IdeaValidate = lazy(() => import('@/pages/ideas/IdeaValidate'))
const IdeaPublic = lazy(() => import('@/pages/ideas/IdeaPublic'))
const Profile = lazy(() => import('@/pages/profile/Profile'))
const Feed = lazy(() => import('@/pages/feed/Feed'))

function PublicRoute({ children }: { children: ReactNode }) {
  const user = useAuthStore(s => s.user)
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

/**
 * /login: si ya hay sesión, redirige sin pisar el destino (evita que PublicRoute mande siempre a /dashboard
 * y anule navigate(returnTo) del formulario tras setUser).
 */
function LoginEntryRoute() {
  const user = useAuthStore(s => s.user)
  const location = useLocation()
  if (user) {
    if (user.sectors.length === 0) {
      return <Navigate to="/onboarding" replace state={location.state} />
    }
    const from =
      sanitizePostAuthReturnPath((location.state as { from?: string } | null)?.from) ??
      peekPostAuthReturn()
    return <Navigate to={from ?? '/dashboard'} replace />
  }
  return <Login />
}

/** /register: tras registro solo debe irse a onboarding conservando state (p. ej. from). */
function RegisterEntryRoute() {
  const user = useAuthStore(s => s.user)
  const location = useLocation()
  if (user) {
    return <Navigate to="/onboarding" replace state={location.state} />
  }
  return <Register />
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
      <Suspense
        fallback={
          <div className="min-h-screen bg-background px-4 py-8 sm:px-6">
            <div className={cn(APP_PAGE_WIDTH_CLASS, 'space-y-4')}>
              <Skeleton className="h-9 w-48 rounded-xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
          </div>
        }
      >
        <Routes>
          <Route
            path="/"
            element={
              <PublicRoute>
                <Home />
              </PublicRoute>
            }
          />
          <Route path="/login" element={<LoginEntryRoute />} />
          <Route path="/register" element={<RegisterEntryRoute />} />
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
          <Route
            path="/ideas/:id/validar"
            element={
              <PrivateRoute>
                <IdeaValidate />
              </PrivateRoute>
            }
          />
          <Route
            path="/ideas/:id"
            element={
              <PrivateRoute>
                <IdeaDetail />
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
