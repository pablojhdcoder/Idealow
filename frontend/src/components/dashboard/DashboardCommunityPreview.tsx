import { useQuery } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowRight, Compass, Flame, Users } from 'lucide-react'
import { IdeaFlashcardCard } from '@/components/ideas/IdeaFlashcardCard'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tag } from '@/components/ui/tag'
import { fetchFeed } from '@/lib/api/feed'
import { cn } from '@/lib/utils'

const PREVIEW_GRID_CLASS =
  'grid gap-4 sm:gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,17rem),1fr))]'
const PREVIEW_CARD_CLASS = 'max-w-none w-full h-[236px] p-4'

export function DashboardCommunityPreview() {
  const navigate = useNavigate()
  const q = useQuery({
    queryKey: ['dashboard-community-preview'] as const,
    queryFn: () => fetchFeed({ sort: 'votes', filter: 'all', limit: 3, page: 1 }),
  })
  const items = q.data?.items ?? []

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="size-3.5" />
          </div>
          <h2 className="font-semibold text-foreground">Comunidad</h2>
          <Tag
            size="xs"
            className="inline-flex items-center gap-1 border-amber-600/20 bg-amber-500/10 text-amber-700"
          >
            <Flame className="size-3" />
            En tendencia
          </Tag>
        </div>
        <Link
          to="/feed"
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'h-8 rounded-full border-border/80 px-3 text-xs',
          )}
        >
          Ver comunidad
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <Card className="rounded-3xl border-border/80 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          {q.isLoading ? (
            <div className={PREVIEW_GRID_CLASS}>
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-[236px] w-full rounded-2xl" />
              ))}
            </div>
          ) : null}

          {!q.isLoading && items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/80 bg-muted/10 py-10 text-center">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Compass className="size-5" />
              </div>
              <p className="max-w-sm text-sm text-muted-foreground">
                Aún no hay ideas destacadas en la comunidad. Publica una idea validada y marca tendencia.
              </p>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => navigate('/feed')}
              >
                Explorar feed
              </Button>
            </div>
          ) : null}

          {!q.isLoading && items.length > 0 ? (
            <div className={PREVIEW_GRID_CLASS}>
              {items.map(item => (
                <IdeaFlashcardCard
                  key={item.id}
                  className={PREVIEW_CARD_CLASS}
                  flashcard={item}
                  onOpen={() =>
                    navigate(`/ideas/${encodeURIComponent(item.id)}`, { state: { from: '/dashboard' } })
                  }
                />
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  )
}
