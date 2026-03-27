import type { CompetitorPublic } from '@/types/flashcard'
import { cn } from '@/lib/utils'

type Props = {
  competitor: CompetitorPublic
  className?: string
}

export function CompetitorCard({ competitor, className }: Props) {
  return (
    <article
      className={cn(
        'min-w-[200px] max-w-[240px] shrink-0 rounded-2xl border border-border bg-card p-4 shadow-xs',
        className,
      )}
    >
      <h4 className="font-semibold text-foreground">{competitor.name}</h4>
      {competitor.url ? (
        <a
          href={competitor.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 block truncate text-xs text-primary underline"
        >
          {competitor.url.replace(/^https?:\/\//, '')}
        </a>
      ) : null}
      {competitor.description ? (
        <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{competitor.description}</p>
      ) : null}
    </article>
  )
}
