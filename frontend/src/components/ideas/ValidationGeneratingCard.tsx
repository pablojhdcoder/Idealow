import { motion } from 'framer-motion'
import { Loader2, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  className?: string
  /** Acciones secundarias (p. ej. forzar validación legacy). */
  footer?: ReactNode
}

/**
 * Estado de espera mientras el backend genera la validación de mercado (post-refinamiento).
 */
export function ValidationGeneratingCard({ className, footer }: Props) {
  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'relative overflow-hidden rounded-3xl border border-border bg-card px-6 py-14 text-center shadow-sm sm:px-12 sm:py-16',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-transparent to-accent/[0.06]"
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute -left-20 top-1/2 size-56 -translate-y-1/2 rounded-full bg-primary/[0.09] blur-3xl"
        animate={{ opacity: [0.5, 0.85, 0.5], scale: [1, 1.06, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute -right-16 bottom-0 size-48 rounded-full bg-accent/[0.08] blur-3xl"
        animate={{ opacity: [0.4, 0.75, 0.4] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        aria-hidden
      />

      <div className="relative mx-auto flex max-w-md flex-col items-center">
        <motion.div
          className="flex items-center gap-2 text-primary/90"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden
        >
          <Sparkles className="size-5 shrink-0" />
          <span className="text-[11px] font-semibold uppercase tracking-wider">Análisis automático</span>
        </motion.div>

        <div className="relative mt-7 flex size-[4.25rem] items-center justify-center">
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-primary/20"
            animate={{ scale: [1, 1.38], opacity: [0.45, 0] }}
            transition={{ duration: 1.75, repeat: Infinity, ease: 'easeOut' }}
            aria-hidden
          />
          <Loader2
            className="size-11 animate-spin text-primary"
            strokeWidth={2}
            aria-label="Generando validación"
          />
        </div>

        <h2 className="font-serif mt-8 text-2xl tracking-tight text-foreground sm:text-[1.65rem]">
          Generando validación de mercado
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          Cruzamos fuentes en el servidor (Reddit, noticias, vídeo, competidores y tendencias). Suele tardar
          hasta un minuto; esta vista se actualiza sola.
        </p>

        {footer ? <div className="mt-10 w-full space-y-4">{footer}</div> : null}
      </div>
    </motion.div>
  )
}

type LegacyActionsProps = {
  legacyError: string | null
  legacyLoading: boolean
  onForceRun: () => void
}

export function ValidationGeneratingLegacyHint({
  legacyError,
  legacyLoading,
  onForceRun,
}: LegacyActionsProps) {
  return (
    <>
      <p className="text-xs leading-relaxed text-muted-foreground">
        La validación ya se inicia sola en el servidor al terminar el refinamiento. Si llevas varios minutos
        sin resultados (fallo puntual o idea antigua sin job), puedes pedir un reintento; si el proceso sigue
        activo o ya terminó, el servidor no duplicará el informe.
      </p>
      {legacyError ? (
        <p className="text-sm text-destructive" role="alert">
          {legacyError}
        </p>
      ) : null}
      <Button
        type="button"
        variant="outline"
        className="rounded-full"
        disabled={legacyLoading}
        onClick={() => void onForceRun()}
      >
        {legacyLoading ? 'Enviando…' : 'Reintentar validación'}
      </Button>
    </>
  )
}
