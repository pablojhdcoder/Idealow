import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useValidationStream,
  type AiSocialSearchPayload,
  type SourceKey,
} from '@/hooks/useValidationStream'
import { ideasQueryKey } from '@/hooks/useIdeasQuery'
import { ScoreRing } from '@/components/ideas/ScoreRing'
import { Button } from '@/components/ui/button'
import { SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const SOURCE_LABELS: Record<SourceKey, string> = {
  reddit: 'Reddit (dolor)',
  trends: 'Tendencias (IA)',
  competitors: 'Competidores (IA)',
  social: 'YouTube + X / Instagram / TikTok (estimación IA)',
  news: 'Noticias (RSS + IA)',
}

const AI_SOCIAL_KEYS = ['x', 'instagram', 'tiktok'] as const

function platformLabel(k: (typeof AI_SOCIAL_KEYS)[number]): string {
  if (k === 'x') return 'X'
  if (k === 'instagram') return 'Instagram'
  return 'TikTok'
}

function SourceRow({
  label,
  status,
  score,
  summary,
  message,
  aiSocialSearch,
}: {
  label: string
  status: 'idle' | 'searching' | 'done' | 'error'
  score?: number
  summary?: string
  message?: string
  aiSocialSearch?: AiSocialSearchPayload
}) {
  return (
    <motion.div
      layout
      className="rounded-2xl border border-border bg-muted/30 px-4 py-3"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {status === 'searching' && (
          <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
        )}
        {status === 'done' && score != null && (
          <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent">
            {score}
          </span>
        )}
        {status === 'error' && (
          <span className="text-xs font-medium text-destructive">Error</span>
        )}
        {status === 'idle' && (
          <span className="text-xs text-muted-foreground">En cola</span>
        )}
      </div>
      {summary && status === 'done' && (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{summary}</p>
      )}
      {aiSocialSearch && status === 'done' && (
        <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Búsqueda social simulada (IA — no hay datos en vivo)
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {AI_SOCIAL_KEYS.map(k => {
              const block = aiSocialSearch[k]
              if (!block) return null
              return (
                <div
                  key={k}
                  className="rounded-xl border border-border/80 bg-background/50 px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      {platformLabel(k)}
                    </span>
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                      {block.signal}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                    {block.synthetic_findings}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {message && status === 'error' && (
        <p className="mt-2 text-xs text-destructive">{message}</p>
      )}
    </motion.div>
  )
}

export function ValidationProgress({
  ideaId,
  onClose,
}: {
  ideaId: string
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const state = useValidationStream(ideaId, true)

  useEffect(() => {
    if (state.complete) {
      void queryClient.invalidateQueries({ queryKey: ideasQueryKey })
    }
  }, [state.complete, queryClient])

  const sources: SourceKey[] = ['reddit', 'news', 'social', 'competitors', 'trends']
  const blockingError = state.streamError || state.startError

  return (
    <div className="flex h-full flex-col">
      <SheetHeader className="border-b border-border text-left">
        <SheetTitle>Validación de mercado</SheetTitle>
        <SheetDescription>
          Reddit, noticias, competidores, tendencias (IA) y redes: YouTube/Shorts (cuota gratuita con
          clave) y bloques X, Instagram y TikTok generados solo por IA (sin APIs de pago ni scraping).
          Los resultados llegan en tiempo real.
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
        {blockingError && (
          <div
            className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
            role="alert"
          >
            {blockingError}
          </div>
        )}

        <div className="flex justify-center py-2">
          <ScoreRing
            score={state.complete ? state.finalScore : null}
            verdict={state.complete ? state.verdict : null}
          />
        </div>

        {state.complete && state.recommendation && (
          <p className="rounded-2xl border border-border bg-card px-4 py-3 text-sm leading-relaxed text-foreground">
            {state.recommendation}
          </p>
        )}

        <div className="grid gap-2">
          {sources.map(key => {
            const s = state[key]
            return (
              <SourceRow
                key={key}
                label={SOURCE_LABELS[key]}
                status={s.status}
                score={s.score}
                summary={s.summary}
                message={s.message}
                aiSocialSearch={key === 'social' ? s.aiSocialSearch : undefined}
              />
            )
          })}
        </div>
      </div>

      <SheetFooter className="border-t border-border">
        <Button
          type="button"
          variant="outline"
          className={cn('w-full rounded-full')}
          onClick={onClose}
        >
          {state.complete ? 'Cerrar' : 'Cancelar'}
        </Button>
      </SheetFooter>
    </div>
  )
}
