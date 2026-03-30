import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CircleDot, Lightbulb, Plus, Sparkles, WandSparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DASHBOARD_STARTERS_VISIBLE, pickRandomStarters } from '@/lib/dashboardSuggestions'
import { cn } from '@/lib/utils'

export function DashboardQuickStart() {
  const navigate = useNavigate()
  const [visibleStarters] = useState(() => pickRandomStarters(DASHBOARD_STARTERS_VISIBLE))

  const handleUse = (starterId: string) => {
    const params = new URLSearchParams({ starter: starterId })
    navigate(`/ideas/new?${params.toString()}`, { state: { from: '/dashboard' } })
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <Card className="rounded-3xl border-dashed border-primary/35 bg-primary/[0.04] shadow-sm">
        <CardContent className="flex h-full flex-col p-5 sm:p-6">
          <div className="flex items-center gap-2 text-primary">
            <Lightbulb className="size-4" />
            <p className="text-xs font-medium uppercase tracking-widest">Acceso directo</p>
          </div>
          <h3 className="mt-2 font-serif text-2xl text-foreground">Nueva idea</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Captura texto, URL, audio, imagen o video con el mismo flujo guiado.
          </p>
          <div className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1 text-[11px] text-muted-foreground">
            <Sparkles className="size-3 text-primary" />
            Flujo guiado de creación
          </div>
          <Link
            to="/ideas/new"
            state={{ from: '/dashboard' }}
            className={cn(buttonVariants(), 'mt-auto inline-flex w-fit gap-2 rounded-full')}
          >
            <Plus className="size-4" />
            Capturar idea
          </Link>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border/80 shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <WandSparkles className="size-3.5" />
              </div>
              <h2 className="font-semibold text-foreground">Empieza en 1 clic</h2>
              <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary">
                AI
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Crea desde cero o usa una base sugerida para acelerar.
            </p>
          </div>

          <div className="mt-5 grid gap-2.5">
            {visibleStarters.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleUse(item.id)}
                className={cn(
                  'group flex w-full items-center justify-between rounded-2xl border border-border/80 bg-background px-4 py-3 text-left transition-colors',
                  'hover:border-primary/35 hover:bg-primary/[0.04]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    <span className="mr-1.5">{item.emoji}</span>
                    {item.shortLine}
                  </p>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-xs capitalize text-muted-foreground">
                    <CircleDot className="size-3" />
                    {item.sector}
                  </p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
