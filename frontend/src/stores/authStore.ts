import { create } from 'zustand'
import { queryClient } from '@/lib/queryClient'

export type User = {
  id: string
  email: string
  username: string
  avatarUrl?: string
  sectors: string[]
  goal: string
}

type AuthStore = {
  user: User | null
  isLoading: boolean
  setUser: (user: User | null) => void
  checkAuth: () => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthStore>(set => ({
  user: null,
  isLoading: true,
  setUser: user => set({ user }),
  checkAuth: async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      if (res.ok) {
        const data = (await res.json()) as { user: User }
        set({ user: data.user, isLoading: false })
      } else {
        set({ user: null, isLoading: false })
      }
    } catch {
      set({ user: null, isLoading: false })
    }
  },
  logout: async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    queryClient.clear()
    set({ user: null })
  },
}))
