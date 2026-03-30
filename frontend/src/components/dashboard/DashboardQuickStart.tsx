import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowRight, Lightbulb, Loader2, Plus, Sparkles, Tag as TagIcon, UserRound, WandSparkles } from 'lucide-react'
import { toast } from 'sonner'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tag } from '@/components/ui/tag'
import { generateIdeaSuggestionFromProfile } from '@/lib/api/users'
import { pickRandomStarters } from '@/lib/dashboardSuggestions'
import { cn } from '@/lib/utils'

/** En "Empieza en 1 clic": 1 fila IA + 2 bases del pool (rotan en cada carga). */
const DASHBOARD_STARTER_ROWS = 2

export function DashboardQuickStart() {
  const navigate = useNavigate()
  const [visibleStarters] = useState(() => pickRandomStarters(DASHBOARD_STARTER_ROWS))
  const generateWithAiMutation = useMutation({
    mutationFn: generateIdeaSuggestionFromProfile,
    onSuccess: data => {
      const params = new URLSearchParams({ prompt: data.content })
      navigate(`/ideas/new?${params.toString()}`, { state: { from: '/dashboard' } })
    },
    onError: () => {
      toast.error('No se pudo generar la idea con IA. Inténtalo de nuevo.')
    },
  })

  const handleUse = (starterId: string) => {
    const params = new URLSearchParams({ starter: starterId })
    navigate(`/ideas/new?${params.toString()}`, { state: { from: '/dashboard' } })
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <Card className="relative overflow-hidden border-border/80 bg-gradient-to-br from-primary/[0.12] via-primary/[0.06] to-background shadow-md shadow-primary/20 ring-2 ring-primary/35 ring-offset-0">
        <div
          className="pointer-events-none absolute -right-12 -top-10 size-44 rounded-full bg-primary/12 blur-3xl"
          aria-hidden
        />
        <CardContent className="relative flex h-full flex-col p-5 sm:p-6">
          <div className="flex items-center gap-2 text-primary">
            <Lightbulb className="size-4 shrink-0" strokeWidth={2.2} aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/90">Acceso directo</p>
          </div>
          <h3 className="mt-5 font-serif text-2xl tracking-tight text-foreground sm:text-[1.75rem]">Nueva idea</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Captura con texto, audio, imagen o video con el mismo flujo guiado.
          </p>
          <Tag
            className="mt-3 w-fit gap-1.5 border-primary/25 bg-primary/10 text-primary"
            size="sm"
          >
            <Sparkles className="size-3 shrink-0" aria-hidden />
            Flujo guiado de creación
          </Tag>
          <motion.div
            className="mt-auto w-fit"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
          >
            <Link
              to="/ideas/new"
              state={{ from: '/dashboard' }}
              className={cn(
                buttonVariants({ size: 'lg' }),
                'inline-flex gap-2.5 rounded-full px-8 shadow-lg shadow-primary/30 ring-2 ring-primary/20',
                'transition-[box-shadow,filter] duration-200 hover:shadow-xl hover:shadow-primary/40 hover:brightness-[1.02]',
              )}
            >
              <Plus className="size-5" strokeWidth={2.2} />
              Capturar idea
            </Link>
          </motion.div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border/80 shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <WandSparkles className="size-3.5" />
              </div>
              <h2 className="font-semibold text-foreground">Empieza con 1 clic</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Crea desde cero con IA o usa una base sugerida para acelerar.
            </p>
          </div>

          <div className="mt-5 grid gap-2.5">
            <button
              type="button"
              disabled={generateWithAiMutation.isPending}
              onClick={() => generateWithAiMutation.mutate()}
              className={cn(
                'group/ai relative flex w-full items-center justify-between overflow-hidden rounded-2xl border border-primary/35 bg-gradient-to-br from-primary/[0.11] via-primary/[0.05] to-background px-4 py-3.5 text-left shadow-sm shadow-primary/10',
                'transition-[border-color,box-shadow,transform] duration-200 ease-out',
                'hover:-translate-y-px hover:border-primary/55 hover:bg-primary/[0.07] hover:shadow-md hover:shadow-primary/18',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'disabled:pointer-events-none disabled:opacity-60',
              )}
            >
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/[0.05] to-transparent"
                aria-hidden
              />
              <div className="relative min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  <span className="mr-1.5 inline-flex align-middle" aria-hidden>
                    {generateWithAiMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin text-primary" />
                    ) : (
                      <WandSparkles className="size-4 text-primary" />
                    )}
                  </span>
                  <span className="text-primary">Generar idea con IA</span>
                </p>
                <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground group-hover/ai:text-primary/80">
                  <UserRound className="size-3 shrink-0 text-primary/55" aria-hidden />
                  Según tu perfil
                </p>
              </div>
              <ArrowRight className="relative size-4 shrink-0 text-primary/65 transition-transform duration-200 ease-out group-hover/ai:translate-x-1 group-hover/ai:text-primary" />
            </button>
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
                  <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs capitalize text-muted-foreground">
                    <TagIcon className="size-3 shrink-0 opacity-60" aria-hidden />
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
