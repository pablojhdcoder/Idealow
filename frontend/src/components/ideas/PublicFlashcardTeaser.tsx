import { motion } from 'framer-motion'
import { MousePointerClick, Sparkles } from 'lucide-react'
import { inferVerdictFromScore, verdictScoreConfig } from '@/lib/flashcardVerdict'
import { sectorPillStyle } from '@/lib/sectorColors'
import { cn } from '@/lib/utils'
import type { IdeaFlashcard } from '@/types/flashcard'
import { Tag } from '@/components/ui/tag'

type Props = {
  flashcard: IdeaFlashcard
  onReveal: () => void
  className?: string
}

export function PublicFlashcardTeaser({ flashcard, onReveal, className }: Props) {
  const verdict = flashcard.verdict ?? inferVerdictFromScore(flashcard.validationScore)
  const cfg = verdictScoreConfig[verdict]
  const sector = flashcard.sector || 'other'
  const pill = sectorPillStyle(sector)

  return (
    <div className={cn('mx-auto w-full max-w-lg space-y-8', className)}>
      <div className="space-y-3 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
          <Sparkles className="size-3.5" aria-hidden />
          Comunidad Idealow
        </div>
        <h1 className="font-serif text-3xl leading-tight text-foreground sm:text-4xl">
          Vista previa de una idea validada
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Explora un resumen de una idea publicada por la comunidad. Idealow ayuda a estructurar y validar ideas con
          señales de mercado.
        </p>
      </div>

      <motion.button
        type="button"
        layout
        onClick={onReveal}
        whileHover={{ y: -3, boxShadow: '0 18px 36px rgba(99,102,241,0.15)' }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className={cn(
          'group relative w-full rounded-3xl border-2 border-primary/25 bg-card p-6 text-left shadow-sm outline-none',
          'focus-visible:ring-2 focus-visible:ring-ring',
        )}
        aria-label="Continuar para ver cómo acceder al detalle"
      >
        <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/[0.07] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        <div className="relative flex items-start justify-between gap-3">
          <Tag
            size="xs"
            className="max-w-[55%] truncate capitalize"
            style={pill}
          >
            {sector}
          </Tag>
          <Tag
            size="xs"
            className="shrink-0"
            style={{ backgroundColor: cfg.bg, color: cfg.text }}
          >
            {flashcard.validationScore}
          </Tag>
        </div>
        <h2 className="relative mt-4 font-serif text-2xl leading-tight text-foreground">{flashcard.refinedTitle}</h2>
        <p className="relative mt-2 line-clamp-3 text-sm text-muted-foreground">
          {flashcard.elevatorPitch || flashcard.problemStatement || 'Idea compartida en Idealow.'}
        </p>
        <div className="relative mt-6 flex items-center justify-between gap-3 rounded-2xl bg-primary/5 px-4 py-3">
          <span className="flex items-center gap-2 text-xs font-medium text-primary">
            <MousePointerClick className="size-4 shrink-0" aria-hidden />
            Pulsa la tarjeta para ver el detalle completo
          </span>
        </div>
      </motion.button>
    </div>
  )
}
