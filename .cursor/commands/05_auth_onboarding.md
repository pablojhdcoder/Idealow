# Command: Auth + Onboarding

## Task
Sistema de autenticación propio con JWT (sin Supabase Auth) y flujo de onboarding de 3 pasos.

---

## Backend: Auth Routes

### `backend/src/routes/auth.ts`

```ts
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { signToken } from '../lib/jwt'
import { validateBody } from '../middleware/validate'
import { z } from 'zod'

const router = Router()

const registerSchema = z.object({
  email:    z.string().email(),
  username: z.string().min(3).max(30),
  password: z.string().min(8),
})

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string(),
})

// Register
router.post('/register', validateBody(registerSchema), async (req, res) => {
  try {
    const { email, username, password } = req.body

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] }
    })
    if (existing) {
      return res.status(409).json({ error: 'Email or username already taken' })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { email, username, passwordHash },
      select: { id: true, email: true, username: true, sectors: true, goal: true }
    })

    const token = signToken(user.id)
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })

    res.json({ user, needsOnboarding: true })
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' })
  }
})

// Login
router.post('/login', validateBody(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    const token = signToken(user.id)
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    const needsOnboarding = !user.sectors || user.sectors.length === 0
    res.json({
      user: { id: user.id, email: user.email, username: user.username, sectors: user.sectors },
      needsOnboarding,
    })
  } catch (err) {
    res.status(500).json({ error: 'Login failed' })
  }
})

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token')
  res.json({ success: true })
})

// Me (get current user)
router.get('/me', async (req, res) => {
  const token = req.cookies?.token
  if (!token) return res.status(401).json({ error: 'Not authenticated' })
  try {
    const { verifyToken } = await import('../lib/jwt')
    const { userId } = verifyToken(token)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true, avatarUrl: true, sectors: true, goal: true, experienceLevel: true }
    })
    res.json({ user })
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
})

export default router
```

---

## Backend: User Profile Route

### `backend/src/routes/users.ts`

```ts
import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { validateBody } from '../middleware/validate'
import { prisma } from '../lib/prisma'
import { z } from 'zod'

const router = Router()

const profileSchema = z.object({
  sectors:         z.array(z.string()).min(1).max(5),
  experienceLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'EXPERT', 'PROFESSIONAL']),
  goal:            z.enum(['HACKATHON', 'SIDE_PROJECT', 'STARTUP', 'LEARNING']),
})

router.patch('/profile', requireAuth, validateBody(profileSchema), async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: req.body,
    select: { id: true, email: true, username: true, sectors: true, goal: true, experienceLevel: true }
  })
  res.json({ user })
})

// Personalized idea suggestions based on profile
router.get('/suggestions', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { sectors: true, goal: true, experienceLevel: true }
  })
  if (!user) return res.status(404).json({ error: 'User not found' })

  const { generateSuggestions } = await import('../services/ai/suggestions')
  const suggestions = await generateSuggestions(user)
  res.json({ suggestions })
})

export default router
```

---

## Frontend: Auth Pages

### `src/pages/auth/Login.tsx`

```tsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const navigate = useNavigate()
  const setUser  = useAuthStore(s => s.setUser)

  const handleSubmit = async (e: React.FormEvent) => {
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
      const data = await res.json()
      if (!res.ok) return setError(data.error)
      setUser(data.user)
      navigate(data.needsOnboarding ? '/onboarding' : '/dashboard')
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-sm border border-gray-100"
      >
        <h1 className="font-serif text-3xl text-gray-900 mb-2">Welcome back</h1>
        <p className="text-gray-400 text-sm mb-8">Sign in to your ideas</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-gray-500 mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm
                focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100
                transition-all"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-sm text-gray-500 mb-1.5 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm
                focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100
                transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full py-3 bg-indigo-500 text-white rounded-full text-sm font-medium
              disabled:opacity-60 transition-opacity mt-2"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </motion.button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          No account?{' '}
          <Link to="/register" className="text-indigo-500 hover:underline">
            Create one
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
```

---

## Frontend: Onboarding

### `src/pages/onboarding/Onboarding.tsx`

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

const SECTORS = [
  { id: 'tech',          emoji: '💻', name: 'Tech & Software',    desc: 'Apps, tools, platforms' },
  { id: 'health',        emoji: '🏥', name: 'Health & Wellness',  desc: 'Fitness, mental health' },
  { id: 'finance',       emoji: '💰', name: 'Finance',            desc: 'Fintech, investing' },
  { id: 'education',     emoji: '📚', name: 'Education',          desc: 'Learning, skills' },
  { id: 'travel',        emoji: '✈️', name: 'Travel',             desc: 'Tourism, experiences' },
  { id: 'food',          emoji: '🍕', name: 'Food & Beverage',    desc: 'Restaurants, delivery' },
  { id: 'sports',        emoji: '⚽', name: 'Sports & Gaming',    desc: 'Teams, esports' },
  { id: 'entertainment', emoji: '🎬', name: 'Entertainment',      desc: 'Media, music, events' },
  { id: 'productivity',  emoji: '⚡', name: 'Productivity',       desc: 'Workflows, automation' },
  { id: 'other',         emoji: '🌟', name: 'Other / Mixed',      desc: 'Anything goes' },
]

const EXPERIENCE = [
  { id: 'BEGINNER',      emoji: '🌱', label: 'Just starting',     desc: "I have ideas but haven't built anything yet" },
  { id: 'INTERMEDIATE',  emoji: '🔨', label: 'Some experience',   desc: "I've built a few projects" },
  { id: 'EXPERT',        emoji: '🚀', label: 'Experienced',       desc: "I've shipped products" },
  { id: 'PROFESSIONAL',  emoji: '💼', label: 'Professional',      desc: 'I build products for a living' },
]

const GOALS = [
  { id: 'HACKATHON',    emoji: '⚡', label: 'Hackathon',     desc: 'I need an idea fast (hours/days)' },
  { id: 'SIDE_PROJECT', emoji: '🌱', label: 'Side project',  desc: 'Something to build on weekends' },
  { id: 'STARTUP',      emoji: '🚀', label: 'Startup',       desc: 'I want to build a real business' },
  { id: 'LEARNING',     emoji: '📖', label: 'Learning',      desc: 'Exploring and experimenting' },
]

export default function Onboarding() {
  const [step, setStep]               = useState(0)
  const [sectors, setSectors]         = useState<string[]>([])
  const [experience, setExperience]   = useState('')
  const [goal, setGoal]               = useState('')
  const [saving, setSaving]           = useState(false)
  const navigate = useNavigate()

  const toggleSector = (id: string) => {
    setSectors(prev =>
      prev.includes(id) ? prev.filter(s => s !== id)
        : prev.length < 5 ? [...prev, id] : prev
    )
  }

  const handleFinish = async () => {
    setSaving(true)
    await fetch('/api/users/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ sectors, experienceLevel: experience, goal }),
    })
    navigate('/dashboard')
  }

  const steps = [
    // Step 0: Sectors
    <motion.div key="sectors" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
      <h2 className="font-serif text-2xl mb-2">What areas interest you?</h2>
      <p className="text-gray-400 text-sm mb-6">Pick up to 5 sectors for your ideas</p>
      <div className="grid grid-cols-2 gap-2.5 mb-8">
        {SECTORS.map(s => (
          <button key={s.id} onClick={() => toggleSector(s.id)}
            className={`p-3.5 rounded-2xl text-left border-2 transition-all
              ${sectors.includes(s.id)
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-100 bg-white hover:border-gray-200'}`}
          >
            <span className="text-xl">{s.emoji}</span>
            <p className="font-medium text-sm mt-1">{s.name}</p>
            <p className="text-xs text-gray-400">{s.desc}</p>
          </button>
        ))}
      </div>
      <button onClick={() => setStep(1)} disabled={sectors.length === 0}
        className="w-full py-3 bg-indigo-500 text-white rounded-full text-sm font-medium disabled:opacity-40">
        Continue
      </button>
    </motion.div>,

    // Step 1: Experience
    <motion.div key="experience" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
      <h2 className="font-serif text-2xl mb-2">Your experience level</h2>
      <p className="text-gray-400 text-sm mb-6">Helps us tailor idea complexity</p>
      <div className="space-y-3 mb-8">
        {EXPERIENCE.map(e => (
          <button key={e.id} onClick={() => setExperience(e.id)}
            className={`w-full p-4 rounded-2xl text-left border-2 transition-all flex items-center gap-3
              ${experience === e.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 bg-white'}`}
          >
            <span className="text-2xl">{e.emoji}</span>
            <div>
              <p className="font-medium text-sm">{e.label}</p>
              <p className="text-xs text-gray-400">{e.desc}</p>
            </div>
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={() => setStep(0)} className="flex-1 py-3 border border-gray-200 rounded-full text-sm text-gray-500">Back</button>
        <button onClick={() => setStep(2)} disabled={!experience}
          className="flex-1 py-3 bg-indigo-500 text-white rounded-full text-sm font-medium disabled:opacity-40">Continue</button>
      </div>
    </motion.div>,

    // Step 2: Goal
    <motion.div key="goal" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
      <h2 className="font-serif text-2xl mb-2">What are you building towards?</h2>
      <p className="text-gray-400 text-sm mb-6">We'll match ideas to your timeline</p>
      <div className="space-y-3 mb-8">
        {GOALS.map(g => (
          <button key={g.id} onClick={() => setGoal(g.id)}
            className={`w-full p-4 rounded-2xl text-left border-2 transition-all flex items-center gap-3
              ${goal === g.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 bg-white'}`}
          >
            <span className="text-2xl">{g.emoji}</span>
            <div>
              <p className="font-medium text-sm">{g.label}</p>
              <p className="text-xs text-gray-400">{g.desc}</p>
            </div>
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={() => setStep(1)} className="flex-1 py-3 border border-gray-200 rounded-full text-sm text-gray-500">Back</button>
        <button onClick={handleFinish} disabled={!goal || saving}
          className="flex-1 py-3 bg-indigo-500 text-white rounded-full text-sm font-medium disabled:opacity-40">
          {saving ? 'Setting up...' : "Let's go"}
        </button>
      </div>
    </motion.div>,
  ]

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-sm border border-gray-100">
        <div className="flex gap-1.5 mb-8">
          {[0, 1, 2].map(i => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300
              ${i < step ? 'bg-indigo-500' : i === step ? 'bg-indigo-300' : 'bg-gray-100'}`} />
          ))}
        </div>
        <AnimatePresence mode="wait">{steps[step]}</AnimatePresence>
      </div>
    </div>
  )
}
```

---

## `src/stores/authStore.ts`

```ts
import { create } from 'zustand'

type User = {
  id: string
  email: string
  username: string
  avatarUrl?: string
  sectors: string[]
  goal: string
}

type AuthStore = {
  user: User | null
  setUser: (user: User | null) => void
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthStore>(set => ({
  user: null,
  setUser: user => set({ user }),
  logout: async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    set({ user: null })
  },
}))
```

---

## Archivos a crear
- `backend/src/routes/auth.ts`
- `backend/src/routes/users.ts`
- `backend/src/lib/jwt.ts`
- `backend/src/middleware/auth.ts`
- `backend/src/middleware/errors.ts`
- `backend/src/services/ai/suggestions.ts`
- `frontend/src/pages/auth/Login.tsx`
- `frontend/src/pages/auth/Register.tsx`
- `frontend/src/pages/onboarding/Onboarding.tsx`
- `frontend/src/pages/dashboard/Dashboard.tsx`
- `frontend/src/stores/authStore.ts`
- `frontend/src/app/Router.tsx`
