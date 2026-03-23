import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import AppRouter from '@/app/Router'

const App = () => {
  const checkAuth = useAuthStore(s => s.checkAuth)
  const isLoading = useAuthStore(s => s.isLoading)

  useEffect(() => {
    void checkAuth()
  }, [checkAuth])

  if (isLoading) {
    return <div className="min-h-screen bg-[#FAFAF8]" />
  }

  return <AppRouter />
}

export default App
