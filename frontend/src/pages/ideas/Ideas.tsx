import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Lightbulb, Plus, Search } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import AppShellHeader from '@/components/layout/AppShellHeader'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { StatsRow } from '@/components/dashboard/StatsRow'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { ideasQueryKey, useIdeasQuery } from '@/hooks/useIdeasQuery'
import { RefinementWizard } from '@/components/ideas/RefinementWizard'
import { ValidationProgress } from '@/components/ideas/ValidationProgress'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { semanticSearchIdeas, fetchSimilarIdeas } from '@/lib/api/semantic'
import { ApiError } from '@/lib/api/client'
import { IdeaFlashcardSheet } from '@/components/ideas/IdeaFlashcardSheet'

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

function IdeaRelatedList({ ideaId, open }: { ideaId: string; open: boolean }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['ideas', ideaId, 'similar'] as const,
    queryFn: () => fetchSimilarIdeas(ideaId, 6),
    enabled: open,
  })

  if (!open) {
    return null
  }
  if (isLoading) {
    return <Skeleton className="mt-3 h-16 w-full rounded-xl" />
  }
  if (isError) {
    const msg =
      error instanceof ApiError && error.status === 503
        ? 'Recomendaciones no disponibles (configura embeddings en el backend).'
        : 'No se pudieron cargar ideas relacionadas.'
    return <p className="mt-2 text-xs text-muted-foreground">{msg}</p>
  }
  const related = data?.ideas ?? []
  if (related.length === 0) {
    return (
      <p className="mt-2 text-xs text-muted-foreground">
        Sin ideas parecidas indexadas aún (espera a que se generen embeddings o crea más ideas).
      </p>
    )
  }
  return (
    <ul className="mt-3 space-y-2 border-t border-border pt-3">
      {related.map(r => (
        <li key={r.id} className="text-sm">
          <span className="font-medium text-foreground">{r.title}</span>
          {r.summary ? (
            <p className="line-clamp-1 text-muted-foreground">{r.summary}</p>
          ) : null}
        </li>
      ))}
    </ul>
  )
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
  const [validateIdeaId, setValidateIdeaId] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [similarFor, setSimilarFor] = useState<string | null>(null)
  const [flashSheetId, setFlashSheetId] = useState<string | null>(null)
  const [flashSheetOpen, setFlashSheetOpen] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchInput.trim()), 350)
    return () => clearTimeout(t)
  }, [searchInput])

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

  const isSearchMode = debouncedQ.length > 0

  const { data: ideas, isLoading, isError, error, refetch } = useIdeasQuery()

  const {
    data: searchData,
    isLoading: searchLoading,
    isError: searchIsError,
    error: searchError,
  } = useQuery({
    queryKey: ['semantic-search', debouncedQ] as const,
    queryFn: () => semanticSearchIdeas({ q: debouncedQ, limit: 15 }),
    enabled: isSearchMode,
  })

  const displayIdeas = isSearchMode ? (searchData?.ideas ?? []) : (ideas ?? [])
  const displayLoading = isSearchMode ? searchLoading : isLoading

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
      <Sheet
        open={validateIdeaId != null}
        onOpenChange={open => {
          if (!open) setValidateIdeaId(null)
        }}
      >
        <SheetContent
          side="right"
          className="w-full rounded-l-3xl border-l sm:max-w-lg"
          showCloseButton
        >
          {validateIdeaId ? (
            <ValidationProgress
              ideaId={validateIdeaId}
              onClose={() => setValidateIdeaId(null)}
            />
          ) : null}
        </SheetContent>
      </Sheet>
      {refineIdeaId && (
        <RefinementWizard
          ideaId={refineIdeaId}
          onComplete={id => {
            void queryClient.invalidateQueries({ queryKey: ideasQueryKey })
            void queryClient.invalidateQueries({ queryKey: ['semantic-search'] })
            setRefineIdeaId(null)
            setValidateIdeaId(id)
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

        <div className="relative mt-6">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="rounded-2xl pl-10"
            placeholder="Buscar por significado (semántico)…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            aria-label="Búsqueda semántica de ideas"
          />
        </div>

        {isSearchMode && searchIsError && (
          <Card className="mt-6 rounded-3xl border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm text-destructive">
              {searchError instanceof Error ? searchError.message : 'Error en la búsqueda'}
            </p>
            {searchError instanceof ApiError && searchError.status === 503 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Define <code className="rounded bg-muted px-1">AZURE_OPENAI_DEPLOYMENT_EMBEDDINGS</code>{' '}
                o <code className="rounded bg-muted px-1">EMBEDDING_MODEL</code> en el backend.
              </p>
            ) : null}
          </Card>
        )}

        {displayLoading && (
          <div className="mt-8 grid gap-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-28 w-full rounded-3xl" />
            ))}
          </div>
        )}

        {!isSearchMode && isError && (
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

        {!displayLoading &&
          !isSearchMode &&
          !isError &&
          ideas &&
          ideas.length === 0 &&
          !searchInput.trim() && (
            <Card className="mt-8 flex flex-col items-center gap-3 rounded-3xl border-dashed py-16 text-center">
              <Lightbulb className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Aún no tienes ideas. Crea la primera.</p>
              <Link to="/ideas/new" state={{ from: '/ideas' }} className={buttonVariants()}>
                Capturar idea
              </Link>
            </Card>
          )}

        {!displayLoading && isSearchMode && !searchIsError && displayIdeas.length === 0 && (
          <Card className="mt-8 rounded-3xl border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Ninguna idea indexada coincide con esa búsqueda. Prueba otras palabras o espera a que se
              generen embeddings.
            </p>
          </Card>
        )}

        {!displayLoading && (!isSearchMode ? !isError && ideas && ideas.length > 0 : !searchIsError) && displayIdeas.length > 0 && (
          <ul className="mt-8 grid gap-4">
            {displayIdeas.map(idea => (
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
                      {idea.validationScore != null && idea.status === 'VALIDATED' && (
                        <Badge className="rounded-full bg-accent/15 text-accent-foreground">
                          Score {idea.validationScore}
                        </Badge>
                      )}
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
                      {idea.status === 'REFINING' && (
                        <Button
                          type="button"
                          size="sm"
                          className="rounded-full"
                          onClick={() => setValidateIdeaId(idea.id)}
                        >
                          Validar mercado
                        </Button>
                      )}
                      {idea.status === 'VALIDATED' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={() => setValidateIdeaId(idea.id)}
                        >
                          Actualizar validación
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full border-primary/30 bg-primary/5"
                        onClick={() => {
                          setFlashSheetId(idea.id)
                          setFlashSheetOpen(true)
                        }}
                      >
                        Ver ficha
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col border-t border-border pt-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-fit rounded-full text-muted-foreground"
                      onClick={() => setSimilarFor(s => (s === idea.id ? null : idea.id))}
                    >
                      {similarFor === idea.id ? 'Ocultar relacionadas' : 'Ideas relacionadas'}
                    </Button>
                    <IdeaRelatedList ideaId={idea.id} open={similarFor === idea.id} />
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </main>
      <IdeaFlashcardSheet
        ideaId={flashSheetId}
        open={flashSheetOpen}
        onOpenChange={open => {
          setFlashSheetOpen(open)
          if (!open) setFlashSheetId(null)
        }}
      />
    </div>
  )
}
