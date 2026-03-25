import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const SIZE = 112
const STROKE = 8
const R = (SIZE - STROKE) / 2
const C = 2 * Math.PI * R

type ScoreRingProps = {
  score: number | null
  verdict?: string | null
  className?: string
}

function verdictTone(verdict: string | null | undefined): string {
  if (!verdict) return 'text-muted-foreground'
  if (verdict === 'STRONG_SIGNAL') return 'text-emerald-600'
  if (verdict === 'MODERATE_SIGNAL') return 'text-amber-600'
  if (verdict === 'WEAK_SIGNAL') return 'text-orange-600'
  return 'text-muted-foreground'
}

export function ScoreRing({ score, verdict, className }: ScoreRingProps) {
  const pct = score == null ? 0 : Math.min(100, Math.max(0, score))
  const offset = C - (pct / 100) * C

  return (
    <div className={cn('relative inline-flex flex-col items-center gap-2', className)}>
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
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-serif text-2xl text-foreground">
          {score == null ? '—' : score}
        </span>
      </div>
      {verdict && (
        <p className={cn('max-w-[10rem] text-center text-xs font-medium', verdictTone(verdict))}>
          {verdict.replaceAll('_', ' ')}
        </p>
      )}
    </div>
  )
}
