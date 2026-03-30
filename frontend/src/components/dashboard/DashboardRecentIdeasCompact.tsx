import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, Clock3, Lightbulb } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { IdeaListItem } from '@/hooks/useIdeasQuery'

type Props = {
  ideas: IdeaListItem[]
  isLoading: boolean
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function DashboardRecentIdeasCompact({ ideas, isLoading }: Props) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Clock3 className="size-3.5" />
          </div>
          <h2 className="font-semibold text-foreground">Ideas recientes</h2>
        </div>
        <Link
          to="/ideas"
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'h-8 rounded-full border-border/80 px-3 text-xs',
          )}
        >
          Ir a mis ideas
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <Card className="rounded-3xl border-border/80 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          {isLoading ? (
            <div className="grid gap-2.5">
              {[1, 2].map(i => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : null}

          {!isLoading && ideas.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border/80 bg-muted/10 py-8 text-center">
              <Lightbulb className="size-6 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Aún no tienes ideas guardadas.</p>
              <Link to="/ideas/new" state={{ from: '/dashboard' }} className={cn(buttonVariants(), 'rounded-full')}>
                Crear la primera
              </Link>
            </div>
          ) : null}

          {!isLoading && ideas.length > 0 ? (
            <ul className="grid gap-2.5">
              {ideas.map(idea => (
                <li key={idea.id}>
                  <Link
                    to={`/ideas/${encodeURIComponent(idea.id)}`}
                    state={{ from: '/dashboard' }}
                    className={cn(
                      'block rounded-xl border border-border/70 bg-background px-3.5 py-3 transition-colors hover:border-primary/25 hover:bg-primary/[0.03]',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    )}
                  >
                    <p className="truncate text-sm font-medium text-foreground">{idea.title}</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="size-3" />
                      {formatDate(idea.createdAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>
    </section>
  )
}
