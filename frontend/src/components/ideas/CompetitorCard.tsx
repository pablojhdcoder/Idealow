import type { CompetitorPublic } from '@/types/flashcard'
import { faviconUrlFromHref } from '@/lib/faviconUrl'
import { cn } from '@/lib/utils'

type Props = {
  competitor: CompetitorPublic
  className?: string
}

export function CompetitorCard({ competitor, className }: Props) {
  const fav = competitor.url ? faviconUrlFromHref(competitor.url) : null

  return (
    <article
      className={cn(
        'min-w-[200px] max-w-[240px] shrink-0 rounded-2xl border border-border/80 bg-muted/15 p-4 transition hover:border-primary/20',
        className,
      )}
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
          {competitor.url ? (
            <a
              href={competitor.url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 font-semibold text-foreground transition hover:text-primary hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="line-clamp-2">{competitor.name}</span>
            </a>
          ) : (
            <h4 className="min-w-0 font-semibold text-foreground">
              <span className="line-clamp-2">{competitor.name}</span>
            </h4>
          )}
        </div>
      </div>
      {competitor.description ? (
        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
          {competitor.description}
        </p>
      ) : null}
    </article>
  )
}
