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

type Props = {
  breakdown: Record<string, ValidationBreakdownEntry> | null
  className?: string
}

export function ValidationBreakdown({ breakdown, className }: Props) {
  if (!breakdown || Object.keys(breakdown).length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Sin desglose de validación (ejecuta validación de mercado primero).
      </p>
    )
  }

  const entries = Object.entries(breakdown)

  return (
    <ul className={cn('grid gap-2 sm:grid-cols-2', className)}>
      {entries.map(([key, v]) => (
        <motion.li
          key={key}
          layout
          className="rounded-2xl border border-border bg-muted/30 px-4 py-3"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground">
              {SOURCE_LABELS[key] ?? key}
            </span>
            {v.score != null && (
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">
                {v.score}
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Peso {(v.weight * 100).toFixed(0)}%
            {v.contribution != null ? ` · Aporte ~${v.contribution}` : null}
          </p>
        </motion.li>
      ))}
    </ul>
  )
}
