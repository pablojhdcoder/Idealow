import { motion } from 'framer-motion'
import type { ValidationBreakdownEntry } from '@/types/flashcard'
import { cn } from '@/lib/utils'

const SOURCE_LABELS: Record<string, string> = {
  reddit: 'Reddit',
  trends: 'Tendencias',
  competitors: 'Competidores',
  social: 'Social',
  news: 'Noticias',
}

const SOURCE_ACCENT: Record<string, string> = {
  reddit: 'border-l-orange-500/80',
  news: 'border-l-sky-500/80',
  social: 'border-l-violet-500/80',
  competitors: 'border-l-emerald-500/80',
  trends: 'border-l-amber-500/80',
}

type Props = {
  breakdown: Record<string, ValidationBreakdownEntry> | null
  className?: string
}

export function ValidationBreakdown({ breakdown, className }: Props) {
  if (!breakdown || Object.keys(breakdown).length === 0) {
    return (
      <p className="text-sm leading-relaxed text-muted-foreground">
        Sin desglose guardado. Cuando completes la validación de mercado, verás aquí el detalle por
        fuente.
      </p>
    )
  }

  const entries = Object.entries(breakdown)

  return (
    <ul className={cn('grid gap-2.5 sm:grid-cols-2', className)}>
      {entries.map(([key, v]) => (
        <motion.li
          key={key}
          layout
          className={cn(
            'rounded-xl border border-border/50 bg-card/70 px-4 py-3 shadow-xs backdrop-blur-sm',
            'border-l-4',
            SOURCE_ACCENT[key] ?? 'border-l-primary/50',
          )}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground">
              {SOURCE_LABELS[key] ?? key}
            </span>
            {v.score != null && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-primary">
                {v.score}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
            Peso {(v.weight * 100).toFixed(0)}%
            {v.contribution != null ? ` · Aporte ~${v.contribution}` : null}
          </p>
        </motion.li>
      ))}
    </ul>
  )
}
