import { useEffect } from 'react'
import type { ComponentType } from 'react'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  CheckCircle2,
  LineChart,
  Loader2,
  Newspaper,
  Sparkles,
  Users,
  MessageCircle
} from 'lucide-react'
import { FaReddit } from 'react-icons/fa6'
import { useQueryClient } from '@tanstack/react-query'
import type { SourceKey, SourceStatus, ValidationStreamState } from '@/hooks/useValidationStream'
import { ideasQueryKey } from '@/hooks/useIdeasQuery'
import {
  ScoreRing,
  formatValidationVerdictLabel,
  validationVerdictBadgeClass,
} from '@/components/ideas/ScoreRing'
import { ValidationReferenceCard } from '@/components/ideas/validation/ValidationReferenceCard'
import { ValidationSocialBlock } from '@/components/ideas/validation/ValidationSocialBlock'
import { faviconUrlFromHref } from '@/lib/faviconUrl'
import { cn } from '@/lib/utils'

const SOURCE_ORDER: SourceKey[] = ['reddit', 'news', 'social', 'competitors', 'trends']

type SourcePanelIcon = ComponentType<{ className?: string }>

const SOURCE_META: Record<
  SourceKey,
  {
    title: string
    description: string
    Icon: SourcePanelIcon
    gradient: string
    /** Color del logo de marca (Lucide sigue usando primary por defecto). */
    iconClass?: string
  }
> = {
  reddit: {
    title: 'Reddit',
    description: 'Búsqueda pública en hilos, citas y enlaces a posts',
    Icon: FaReddit,
    gradient: 'from-orange-500/12 via-transparent to-transparent',
    iconClass: 'text-[#FF4500]',
  },
  news: {
    title: 'Noticias',
    description: 'Todas las noticias de Google News relacionadas con la idea',
    Icon: Newspaper,
    gradient: 'from-sky-500/12 via-transparent to-transparent',
  },
  social: {
    title: 'Redes sociales',
    description:
      'La idea en las redes sociales, YouTube, X, Instagram y TikTok',
    Icon: MessageCircle,
    gradient: 'from-violet-500/12 via-transparent to-transparent',
    iconClass: 'text-[#FF0000]',
  },
  competitors: {
    title: 'Competidores',
    description: 'Panorama de mercado e ideas de posicionamiento',
    Icon: Users,
    gradient: 'from-emerald-500/12 via-transparent to-transparent',
  },
  trends: {
    title: 'Tendencias',
    description: 'Momentum estimado por IA y enlaces a búsquedas para profundizar',
    Icon: LineChart,
    gradient: 'from-amber-500/12 via-transparent to-transparent',
  },
}

function StatusBadge({ s }: { s: SourceStatus }) {
  if (s.status === 'searching') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        Analizando
      </span>
    )
  }
  if (s.status === 'done' && s.score != null) {
    return (
      <span className="rounded-full bg-primary/15 px-3 py-1 text-sm font-semibold tabular-nums text-primary">
        {s.score}
      </span>
    )
  }
  if (s.status === 'error') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
        <AlertCircle className="size-3.5" aria-hidden />
        Error
      </span>
    )
  }
  if (s.status === 'idle') {
    return (
      <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
        En cola
      </span>
    )
  }
  return null
}

function CompetitorSection({ s }: { s: SourceStatus }) {
  if (s.status !== 'done' || !s.competitors?.length) return null
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      {s.competitors.map(c => {
        const fav = c.url ? faviconUrlFromHref(c.url) : null
        return (
        <div
          key={c.name}
          className="rounded-2xl border border-border/80 bg-muted/15 p-4 transition hover:border-primary/20"
        >
          <div className="flex items-start gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {fav ? (
                <img
                  src={fav}
                  alt=""
                  className="size-7 shrink-0 rounded-md border border-border/60 bg-background object-contain p-1"
                  loading="lazy"
                  onError={e => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : null}
              {c.url ? (
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 font-semibold text-foreground transition hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                >
                  <span className="line-clamp-2">{c.name}</span>
                </a>
              ) : (
                <h4 className="min-w-0 font-semibold text-foreground">
                  <span className="line-clamp-2">{c.name}</span>
                </h4>
              )}
            </div>
          </div>
          {c.description ? (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{c.description}</p>
          ) : null}
          {c.strength ? (
            <p className="mt-2 text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">Fortaleza: </span>
              {c.strength}
            </p>
          ) : null}
          {c.weakness ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">Debilidad: </span>
              {c.weakness}
            </p>
          ) : null}
        </div>
        )
      })}
    </div>
  )
}

function GapSection({ s }: { s: SourceStatus }) {
  const g = s.gapAnalysis
  if (s.status !== 'done' || !g) return null
  if (!g.gap && !g.positioning && !g.advantage) return null
  return (
    <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/5 p-4 sm:p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Brecha de mercado</p>
      {g.gap ? <p className="mt-2 text-sm leading-relaxed text-foreground">{g.gap}</p> : null}
      {g.positioning ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Posicionamiento sugerido: </span>
          {g.positioning}
        </p>
      ) : null}
      {g.advantage ? (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Ventaja clave: </span>
          {g.advantage}
        </p>
      ) : null}
    </div>
  )
}

function SourcePanel({ sourceKey, state }: { sourceKey: SourceKey; state: SourceStatus }) {
  const meta = SOURCE_META[sourceKey]
  const Icon = meta.Icon

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
    >
      <div
        className={cn(
          'relative flex flex-col gap-4 border-b border-border/60 p-6 sm:flex-row sm:items-start sm:justify-between',
          'bg-gradient-to-br',
          meta.gradient,
        )}
      >
        <div className="flex gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-background/90 shadow-sm">
            <Icon
              className={cn('size-6', meta.iconClass ?? 'text-primary')}
              aria-hidden
            />
          </div>
          <div>
            <h2 className="font-serif text-xl tracking-tight text-foreground sm:text-2xl">{meta.title}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {meta.description}
            </p>
          </div>
        </div>
        <div className="shrink-0 sm:pt-1">
          <StatusBadge s={state} />
        </div>
      </div>

      <div className="p-6 pt-5">
        {state.message && state.status === 'error' ? (
          <p className="text-sm text-destructive">{state.message}</p>
        ) : null}

        {state.summary && state.status === 'done' && sourceKey !== 'social' ? (
          <p className="text-sm leading-relaxed text-foreground/90">{state.summary}</p>
        ) : null}

        {state.bestQuote?.text && sourceKey === 'reddit' && state.status === 'done' ? (
          <blockquote className="mt-4 rounded-2xl border border-border bg-muted/25 px-4 py-3 text-sm italic text-muted-foreground">
            “{state.bestQuote.text}”
            {state.bestQuote.url ? (
              <a
                href={state.bestQuote.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block text-xs font-semibold not-italic text-primary hover:underline"
              >
                Ver hilo
              </a>
            ) : null}
          </blockquote>
        ) : null}

        {sourceKey === 'reddit' && state.redditSubreddits && state.redditSubreddits.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {state.redditSubreddits.slice(0, 4).map(raw => {
              const name = raw.replace(/^r\//i, '').trim()
              if (!name) return null
              return (
                <a
                  key={raw}
                  href={`https://www.reddit.com/r/${encodeURIComponent(name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground transition hover:border-primary/30 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  r/{name}
                </a>
              )
            })}
          </div>
        ) : null}

        {state.references && state.references.length > 0 && state.status === 'done' ? (
          <div className="mt-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Fuentes y enlaces
            </p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {(sourceKey === 'reddit' || sourceKey === 'news'
                ? state.references.slice(0, 5)
                : state.references
              ).map((ref, i) => (
                <ValidationReferenceCard
                  key={`${ref.url}-${i}`}
                  href={ref.url}
                  title={ref.title}
                  subtitle={ref.subtitle}
                  imageUrl={ref.imageUrl}
                />
              ))}
            </div>
          </div>
        ) : null}

        {sourceKey === 'trends' && state.trendExploreLinks && state.trendExploreLinks.length > 0 ? (
          <div className="mt-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Explorar temas
            </p>
            <div className="flex flex-wrap gap-2">
              {state.trendExploreLinks.map(link => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-border bg-muted/20 px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/25 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        ) : null}

        {sourceKey === 'competitors' ? (
          <>
            <CompetitorSection s={state} />
            <GapSection s={state} />
          </>
        ) : null}

        {sourceKey === 'social' ? <ValidationSocialBlock s={state} /> : null}
      </div>
    </motion.article>
  )
}

export function ValidationProgress({ state }: { state: ValidationStreamState }) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (state.complete) {
      void queryClient.invalidateQueries({ queryKey: ideasQueryKey })
    }
  }, [state.complete, queryClient])

  const blockingError = state.streamError || state.startError

  return (
    <div className="flex flex-col gap-10">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-accent/5" aria-hidden />
        <div className="relative px-6 py-10 sm:px-10 sm:py-12">
          <div className="flex flex-wrap items-center gap-2 text-primary">
            <Sparkles className="size-5" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {state.complete ? 'Resultados guardados' : 'Validación de mercado'}
            </span>
          </div>
          <h1 className="mt-3 font-serif text-3xl tracking-tight text-foreground sm:text-4xl">
            Validación de mercado
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
            {state.complete
              ? 'Estos resultados se generaron una sola vez al terminar el refinamiento y permanecen asociados a la idea.'
              : 'Cruzamos Reddit, noticias, redes y vídeo, competidores y tendencias. Cada bloque incluye enlaces para comprobar las fuentes.'}
          </p>
        </div>
      </motion.header>

      {blockingError ? (
        <div
          className="rounded-3xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive shadow-sm"
          role="alert"
        >
          {blockingError}
        </div>
      ) : null}

      <div className="flex w-full flex-col gap-8">
        <div className="rounded-3xl border border-border bg-gradient-to-b from-card to-muted/20 p-8 shadow-sm sm:p-10 md:p-12">
          <div className="flex flex-col items-center text-center">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Puntuación global
              </p>
              {state.complete && state.verdict ? (
                <span
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs font-semibold capitalize',
                    validationVerdictBadgeClass(state.verdict),
                  )}
                >
                  {formatValidationVerdictLabel(state.verdict)}
                </span>
              ) : null}
            </div>
            <div className="mt-6 sm:mt-7">
              <ScoreRing
                score={state.complete ? state.finalScore : null}
                showVerdict={false}
                ringScale={1.45}
              />
            </div>
            {state.complete ? (
              <div className="mt-8 flex items-center justify-center gap-2 text-sm font-medium text-emerald-600">
                <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                Validación completada
              </div>
            ) : (
              <p className="mt-8 max-w-md text-sm leading-relaxed text-muted-foreground">
                El score se actualiza al terminar todas las fuentes.
              </p>
            )}
          </div>
        </div>

        {state.complete && state.recommendation ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-primary/15 bg-primary/5 px-6 py-5 text-sm leading-relaxed text-foreground shadow-sm sm:px-8 sm:text-[15px]"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Recomendación</p>
            <p className="mt-2">{state.recommendation}</p>
          </motion.div>
        ) : null}

        <div className="space-y-5">
          {SOURCE_ORDER.map(key => (
            <SourcePanel key={key} sourceKey={key} state={state[key]} />
          ))}
        </div>
      </div>
    </div>
  )
}
