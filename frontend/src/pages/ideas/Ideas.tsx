import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Lightbulb, Plus } from 'lucide-react'
import AppShellHeader from '@/components/layout/AppShellHeader'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { StatsRow } from '@/components/dashboard/StatsRow'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ideasQueryKey, useIdeasQuery } from '@/hooks/useIdeasQuery'
import { RefinementWizard } from '@/components/ideas/RefinementWizard'
import { useQueryClient } from '@tanstack/react-query'

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export default function Ideas() {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const highlightId =
    location.state && typeof location.state === 'object' && 'highlightId' in location.state
      ? String((location.state as { highlightId?: string }).highlightId)
      : undefined

  const [refineIdeaId, setRefineIdeaId] = useState<string | null>(null)

  useEffect(() => {
    const st = location.state as { openRefineId?: string; highlightId?: string } | null
    if (st?.openRefineId) {
      setRefineIdeaId(st.openRefineId)
      navigate(location.pathname, {
        replace: true,
        state: st.highlightId ? { highlightId: st.highlightId } : {},
      })
    }
  }, [location.pathname, location.state, navigate])

  const { data: ideas, isLoading, isError, error, refetch } = useIdeasQuery()

  const stats = useMemo(() => {
    const list = ideas ?? []
    return [
      { label: 'Total ideas', value: String(list.length) },
      { label: 'Publicadas', value: String(list.filter(i => i.isPublished).length) },
      { label: 'Borradores', value: String(list.filter(i => i.status === 'DRAFT').length) },
      { label: 'Con sector', value: String(list.filter(i => Boolean(i.sector)).length) },
    ]
  }, [ideas])

  return (
    <div className="min-h-screen bg-background">
      {refineIdeaId && (
        <RefinementWizard
          ideaId={refineIdeaId}
          onComplete={() => {
            void queryClient.invalidateQueries({ queryKey: ideasQueryKey })
            setRefineIdeaId(null)
          }}
          onDismiss={() => setRefineIdeaId(null)}
        />
      )}
      <AppShellHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-serif text-3xl text-foreground">Mis ideas</h1>
          <Link
            to="/ideas/new"
            state={{ from: '/ideas' }}
            className={buttonVariants({ className: 'gap-2 shrink-0 rounded-2xl' })}
          >
            <Plus className="size-4" />
            Nueva idea
          </Link>
        </div>

        <div className="mt-6">
          <StatsRow stats={stats} />
        </div>

        {isLoading && (
          <div className="mt-8 grid gap-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-28 w-full rounded-3xl" />
            ))}
          </div>
        )}

        {isError && (
          <Card className="mt-8 rounded-3xl border-destructive/30 bg-destructive/5 p-6">
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : 'No se pudieron cargar las ideas'}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-3 text-sm font-medium text-primary underline"
            >
              Reintentar
            </button>
          </Card>
        )}

        {!isLoading && !isError && ideas && ideas.length === 0 && (
          <Card className="mt-8 flex flex-col items-center gap-3 rounded-3xl border-dashed py-16 text-center">
            <Lightbulb className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Aún no tienes ideas. Crea la primera.</p>
            <Link to="/ideas/new" state={{ from: '/ideas' }} className={buttonVariants()}>
              Capturar idea
            </Link>
          </Card>
        )}

        {!isLoading && !isError && ideas && ideas.length > 0 && (
          <ul className="mt-8 grid gap-4">
            {ideas.map(idea => (
              <li key={idea.id}>
                <Card
                  className={`rounded-3xl p-5 transition-shadow ${
                    highlightId === idea.id ? 'ring-2 ring-primary/50 shadow-md' : ''
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold text-foreground">{idea.title}</h2>
                      {idea.summary && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {idea.summary}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">{formatDate(idea.createdAt)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {idea.sector && (
                        <Badge variant="secondary" className="rounded-full capitalize">
                          {idea.sector}
                        </Badge>
                      )}
                      <Badge variant="outline" className="rounded-full">
                        {idea.status}
                      </Badge>
                      {idea.status === 'DRAFT' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={() => {
                            void queryClient.removeQueries({ queryKey: ['refine-questions', idea.id] })
                            setRefineIdeaId(idea.id)
                          }}
                        >
                          Refinar
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
