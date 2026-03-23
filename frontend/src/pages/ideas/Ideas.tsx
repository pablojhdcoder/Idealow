import { Link } from 'react-router-dom'
import { Lightbulb, Plus } from 'lucide-react'
import AppShellHeader from '@/components/layout/AppShellHeader'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { StatsRow } from '@/components/dashboard/StatsRow'

export default function Ideas() {
  const stats = [
    { label: 'Total ideas', value: '—' },
    { label: 'Validated', value: '—' },
    { label: 'Published', value: '—' },
    { label: 'Average score', value: '—' },
  ]

  return (
    <div className="min-h-screen bg-background">
      <AppShellHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-3xl text-foreground">My ideas</h1>
          <Link
            to="/ideas/new"
            state={{ from: '/ideas' }}
            className={buttonVariants({ className: 'gap-2' })}
          >
            <Plus className="size-4" />
            New idea
          </Link>
        </div>

        <div className="mt-6">
          <StatsRow stats={stats} />
        </div>

        <Card className="mt-8 flex flex-col items-center gap-3 border-dashed py-16 text-center">
          <Lightbulb className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            You still have no ideas. Start by creating one.
          </p>
        </Card>
      </main>
    </div>
  )
}
