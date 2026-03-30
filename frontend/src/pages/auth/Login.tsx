import { useState, useEffect, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuthStore, type User } from '@/stores/authStore'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { appPageMainClassName } from '@/lib/appPageLayout'
import {
  peekPostAuthReturn,
  rememberPostAuthReturn,
  sanitizePostAuthReturnPath,
} from '@/lib/postAuthRedirect'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const location = useLocation()
  const setUser = useAuthStore(s => s.setUser)
  const returnTo = sanitizePostAuthReturnPath(
    (location.state as { from?: string } | null)?.from,
  )

  useEffect(() => {
    const from = sanitizePostAuthReturnPath(
      (location.state as { from?: string } | null)?.from,
    )
    if (from) rememberPostAuthReturn(from)
    else rememberPostAuthReturn(null)
  }, [location.key, location.state])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      const data = (await res.json()) as {
        user: User
        needsOnboarding?: boolean
        error?: string
      }
      if (!res.ok) return setError(data.error ?? 'No se pudo iniciar sesión')
      if (data.needsOnboarding) {
        const dest =
          sanitizePostAuthReturnPath((location.state as { from?: string } | null)?.from) ??
          peekPostAuthReturn()
        if (dest) rememberPostAuthReturn(dest)
      }
      setUser(data.user)
    } catch {
      setError('Ha ocurrido un error. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className={appPageMainClassName('flex min-h-screen items-center justify-center py-10')}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
        <Card className="p-8">
          <div className="mb-8 text-center">
            <p className="font-serif text-3xl text-foreground">Idealow</p>
            <p className="mt-2 text-sm text-muted-foreground">Inicia sesión para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <Label>Correo</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="pl-10 pr-4"
                  placeholder="tu@ejemplo.com"
                />
              </div>
            </div>

            <div>
              <Label>Contraseña</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pl-4 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600"
              >
                {error}
              </motion.p>
            )}

            <Button type="submit" disabled={loading} className="mt-2 w-full">
              {loading && <Loader2 className="size-4 animate-spin" />}
              Entrar
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{' '}
            <Link
              to="/register"
              state={returnTo ? { from: returnTo } : undefined}
              className="font-medium text-primary hover:underline"
            >
              Crear cuenta
            </Link>
          </p>
        </Card>
      </motion.div>
      </div>
    </div>
  )
}
