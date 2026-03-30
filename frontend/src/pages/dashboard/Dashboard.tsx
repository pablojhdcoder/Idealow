import { motion } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import AppShellHeader from '@/components/layout/AppShellHeader'
import { useIdeasQuery } from '@/hooks/useIdeasQuery'
import { appPageMainClassName } from '@/lib/appPageLayout'
import { DashboardCommunityPreview } from '@/components/dashboard/DashboardCommunityPreview'
import { DashboardHero } from '@/components/dashboard/DashboardHero'
import { DashboardQuickStart } from '@/components/dashboard/DashboardQuickStart'
import { DashboardRecentIdeasCompact } from '@/components/dashboard/DashboardRecentIdeasCompact'

export default function Dashboard() {
  const user = useAuthStore(s => s.user)
  const name = user?.username || user?.email?.split('@')[0] || 'aquí'
  const { data: ideas, isLoading } = useIdeasQuery()
  const recent = (ideas ?? []).slice(0, 2)

  return (
    <div className="min-h-screen bg-background">
      <AppShellHeader />
      <main className={appPageMainClassName('py-8')}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <DashboardHero name={name} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6"
        >
          <DashboardQuickStart />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8"
        >
          <DashboardRecentIdeasCompact ideas={recent} isLoading={isLoading} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 pb-8"
        >
          <DashboardCommunityPreview />
        </motion.div>
      </main>
    </div>
  )
}
