import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const SIZE = 112
const STROKE = 8
const R = (SIZE - STROKE) / 2
const C = 2 * Math.PI * R

type ScoreRingProps = {
  score: number | null
  verdict?: string | null
  /** Clases extra en la columna (anillo + veredicto opcional). */
  className?: string
  /**
   * Escala visual del anillo. El contenedor reserva ancho/alto `SIZE * ringScale`
   * para que el dibujo escalado no se solape con el veredicto ni colapse el layout.
   */
  ringScale?: number
  /** Si es false, no se muestra el texto bajo el anillo (p. ej. el veredicto va en otro sitio). */
  showVerdict?: boolean
}

function verdictTone(verdict: string | null | undefined): string {
  if (!verdict) return 'text-muted-foreground'
  if (verdict === 'STRONG_SIGNAL') return 'text-emerald-600'
  if (verdict === 'MODERATE_SIGNAL') return 'text-amber-600'
  if (verdict === 'WEAK_SIGNAL') return 'text-orange-600'
  return 'text-muted-foreground'
}

/** Estilos de badge para el veredicto fuera del anillo (p. ej. cabecera de validación). */
export function validationVerdictBadgeClass(verdict: string | null | undefined): string {
  if (!verdict) return 'border-border/80 bg-muted/40 text-muted-foreground'
  if (verdict === 'STRONG_SIGNAL') return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
  if (verdict === 'MODERATE_SIGNAL') return 'border-amber-500/35 bg-amber-500/10 text-amber-800 dark:text-amber-400'
  if (verdict === 'WEAK_SIGNAL') return 'border-orange-500/35 bg-orange-500/10 text-orange-800 dark:text-orange-400'
  return 'border-border/80 bg-muted/40 text-muted-foreground'
}

export function formatValidationVerdictLabel(verdict: string): string {
  if (verdict === 'STRONG_SIGNAL') return 'Señal fuerte'
  if (verdict === 'MODERATE_SIGNAL') return 'Señal moderada'
  if (verdict === 'WEAK_SIGNAL') return 'Señal débil'
  if (verdict === 'NO_SIGNAL') return 'Sin señal'
  return verdict.replaceAll('_', ' ')
}

export function ScoreRing({
  score,
  verdict,
  className,
  ringScale = 1,
  showVerdict = true,
}: ScoreRingProps) {
  const pct = score == null ? 0 : Math.min(100, Math.max(0, score))
  const offset = C - (pct / 100) * C
  const s = ringScale
  const box = SIZE * s

  return (
    <div className={cn('inline-flex flex-col items-center gap-3', className)}>
      <div
        className="flex shrink-0 items-center justify-center"
        style={{ width: box, height: box }}
      >
        <div
          className="relative shrink-0"
          style={{
            width: SIZE,
            height: SIZE,
            transform: `scale(${s})`,
            transformOrigin: 'center center',
          }}
        >
          <svg width={SIZE} height={SIZE} className="-rotate-90" aria-hidden>
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke="currentColor"
              strokeWidth={STROKE}
              className="text-border"
            />
            <motion.circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke="currentColor"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={C}
              initial={{ strokeDashoffset: C }}
              animate={{ strokeDashoffset: offset }}
              transition={{ type: 'spring', stiffness: 80, damping: 18 }}
              className="text-primary"
            />
          </svg>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center">
            <span className="font-serif text-2xl tabular-nums text-foreground">
              {score == null ? '—' : score}
            </span>
          </div>
        </div>
      </div>
      {showVerdict && verdict ? (
        <p className={cn('max-w-[12rem] text-center text-xs font-medium leading-snug', verdictTone(verdict))}>
          {formatValidationVerdictLabel(verdict)}
        </p>
      ) : null}
    </div>
  )
}
