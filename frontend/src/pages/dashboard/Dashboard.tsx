import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Lightbulb } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import AppShellHeader from '@/components/layout/AppShellHeader'
import { DashboardSuggestions } from '@/components/dashboard/DashboardSuggestions'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useIdeasQuery } from '@/hooks/useIdeasQuery'

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso))
  } catch {
    return iso
  }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const name = user?.username || user?.email?.split('@')[0] || 'there'

  const { data: ideas, isLoading } = useIdeasQuery()
  const recent = (ideas ?? []).slice(0, 3)

  return (
    <div className="min-h-screen bg-background">
      <AppShellHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="font-serif text-2xl text-foreground sm:text-3xl">
          Welcome, {name} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What idea do you want to explore today?
        </p>

        <Link
          to="/ideas/new"
          state={{ from: '/dashboard' }}
          className="mt-6 flex w-full items-center gap-4 rounded-3xl border-2 border-dashed border-primary/30 bg-primary/5 px-6 py-7 transition-all hover:border-primary/60 hover:bg-primary/10"
        >
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-md shadow-primary/30">
            <Plus className="size-6" strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-semibold text-foreground">Capture a new idea</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Text, URL, audio, image or video
            </p>
          </div>
        </Link>

        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Recent ideas</h2>
            <Link to="/ideas" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            {isLoading && (
              <div className="grid gap-3">
                {[1, 2].map(i => (
                  <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                ))}
              </div>
            )}
            {!isLoading && recent.length === 0 && (
              <Card className="rounded-2xl border-dashed">
                <CardContent className="flex flex-col items-center gap-3 py-12">
                  <Lightbulb className="size-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    You still have no ideas. Capture your first one!
                  </p>
                </CardContent>
              </Card>
            )}
            {!isLoading && recent.length > 0 && (
              <ul className="grid gap-3">
                {recent.map(idea => (
                  <li key={idea.id}>
                    <Link to="/ideas">
                      <Card className="rounded-2xl transition-colors hover:bg-muted/40">
                        <CardContent className="flex flex-col gap-1 py-4">
                          <p className="font-medium text-foreground">{idea.title}</p>
                          {idea.summary && (
                            <p className="line-clamp-2 text-sm text-muted-foreground">{idea.summary}</p>
                          )}
                          <p className="text-xs text-muted-foreground">{formatDate(idea.createdAt)}</p>
                        </CardContent>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </section>

        <section className="mt-10">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="font-semibold text-foreground">Suggested prompts</h2>
            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
              AI
            </Badge>
          </div>
          <DashboardSuggestions />
        </section>
      </main>
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
        aria-label="New idea"
        onClick={() => navigate('/ideas/new', { state: { from: '/dashboard' } })}
      >
        <Plus size={22} />
      </motion.button>
    </div>
  )
}
