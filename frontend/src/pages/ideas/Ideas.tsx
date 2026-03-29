import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { IdeaFlashcardCard } from '@/components/ideas/IdeaFlashcardCard'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, ChevronDown, Lightbulb, Plus, Search, Sparkles } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import AppShellHeader from '@/components/layout/AppShellHeader'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StatsRow } from '@/components/dashboard/StatsRow'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ideasQueryKey, useIdeasQuery } from '@/hooks/useIdeasQuery'
import { RefinementWizard } from '@/components/ideas/RefinementWizard'
import { semanticSearchIdeas, fetchSimilarCommunityFeed } from '@/lib/api/semantic'
import { ApiError } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { appPageMainClassName } from '@/lib/appPageLayout'

/** Curva alineada con Feed (movimiento coherente en la app). */
const PAGE_EASE = [0.22, 1, 0.36, 1] as const

const listContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.06 },
  },
}

const listItem = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 380, damping: 28 },
  },
}

/** Misma retícula fluida que el feed para flashcards relacionadas. */
const RELATED_FEED_GRID_CLASS =
  'grid gap-4 sm:gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,17.5rem),1fr))]'
const RELATED_FLASHCARD_CLASS = 'max-w-none w-full h-[264px] p-5'

const relatedGridContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
}

const relatedGridItem = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 380, damping: 28 },
  },
}

const skeletonStagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
}

const skeletonItem = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: PAGE_EASE },
  },
}

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
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['ideas', ideaId, 'similar-community-feed'] as const,
    queryFn: () => fetchSimilarCommunityFeed(ideaId, 8),
    enabled: open,
  })

  if (!open) {
    return null
  }
  if (isLoading) {
    return (
      <motion.div
        variants={skeletonStagger}
        initial="hidden"
        animate="show"
        className={cn('mt-4', RELATED_FEED_GRID_CLASS)}
      >
        {[1, 2, 3, 4].map(i => (
          <motion.div key={i} variants={skeletonItem} className="min-w-0">
            <Skeleton className="h-[264px] w-full rounded-2xl" />
          </motion.div>
        ))}
      </motion.div>
    )
  }
  if (isError) {
    const msg =
      error instanceof ApiError && error.status === 503
        ? 'Recomendaciones no disponibles (configura embeddings en el backend).'
        : 'No se pudieron cargar ideas de la comunidad.'
    return (
      <motion.p
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: PAGE_EASE }}
        className="mt-3 text-sm text-muted-foreground"
      >
        {msg}
      </motion.p>
    )
  }
  const items = data?.items ?? []
  if (items.length === 0) {
    return (
      <motion.p
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: PAGE_EASE }}
        className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground"
      >
        No hay coincidencias publicadas aún. Tu idea necesita embedding; en la comunidad solo aparecen
        ideas validadas y publicadas con embedding indexado.
      </motion.p>
    )
  }
  return (
    <div className="mt-4">
      <motion.div
        variants={relatedGridContainer}
        initial="hidden"
        animate="show"
        className={RELATED_FEED_GRID_CLASS}
      >
        {items.map(fc => (
          <motion.div key={fc.id} variants={relatedGridItem} className="min-w-0">
            <IdeaFlashcardCard
              className={RELATED_FLASHCARD_CLASS}
              flashcard={fc}
              onOpen={() =>
                navigate(`/ideas/${encodeURIComponent(fc.id)}`, { state: { from: '/ideas' } })
              }
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
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
  const [searchInput, setSearchInput] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [similarFor, setSimilarFor] = useState<string | null>(null)

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
      {refineIdeaId && (
        <RefinementWizard
          ideaId={refineIdeaId}
          onComplete={id => {
            void queryClient.invalidateQueries({ queryKey: ideasQueryKey })
            void queryClient.invalidateQueries({ queryKey: ['semantic-search'] })
            void queryClient.invalidateQueries({
              queryKey: ['ideas', id, 'similar-community-feed'],
            })
            setRefineIdeaId(null)
            navigate(`/ideas/${encodeURIComponent(id)}/validar`, { state: { from: '/ideas' } })
          }}
          onDismiss={() => setRefineIdeaId(null)}
        />
      )}
      <AppShellHeader />
      <main className={appPageMainClassName('py-8')}>
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: PAGE_EASE }}
          className={cn(
            'relative overflow-hidden rounded-3xl border border-primary/15',
            'bg-gradient-to-br from-primary/[0.09] via-background to-amber-500/[0.06]',
            'px-5 py-7 shadow-sm sm:px-8 sm:py-9',
          )}
        >
          <div
            className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-primary/10 blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
                <Lightbulb className="size-6" strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <h1 className="font-serif text-3xl tracking-tight text-foreground sm:text-4xl">
                  Mis ideas
                </h1>
                <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  Refina, valida y publica. Busca por significado cuando tengas muchas guardadas.
                </p>
              </div>
            </div>
            <motion.div
              className="shrink-0"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 520, damping: 28 }}
            >
              <Link
                to="/ideas/new"
                state={{ from: '/ideas' }}
                className={cn(
                  buttonVariants(),
                  'inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 shadow-md shadow-primary/20 transition-shadow duration-200 hover:shadow-lg hover:shadow-primary/25',
                )}
              >
                <Plus className="size-4" aria-hidden />
                Nueva idea
              </Link>
            </motion.div>
          </div>
        </motion.section>

        <motion.div
          className="mt-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.06, ease: PAGE_EASE }}
        >
          <StatsRow stats={stats} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.11, ease: PAGE_EASE }}
        >
          <Card className="mt-6 rounded-3xl border-border/80 bg-card/80 p-3 shadow-sm backdrop-blur-sm transition-shadow duration-200 hover:shadow-md sm:p-4">
            <h2 className="sr-only">Buscar ideas</h2>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="relative min-w-0 flex-1">
                <Label htmlFor="ideas-semantic-search" className="sr-only">
                  Búsqueda semántica
                </Label>
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground transition-colors duration-200"
                  aria-hidden
                />
                <Input
                  id="ideas-semantic-search"
                  className="h-9 rounded-xl border-border/80 pl-9 text-sm shadow-xs transition-[border-color,box-shadow] duration-200"
                  placeholder="Título, texto capturado o significado…"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  aria-label="Búsqueda semántica de ideas"
                />
              </div>
              <AnimatePresence mode="popLayout" initial={false}>
                {isSearchMode ? (
                  <motion.div
                    key="semantic-badge"
                    initial={{ opacity: 0, scale: 0.94, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 0.94, filter: 'blur(4px)' }}
                    transition={{ duration: 0.2, ease: PAGE_EASE }}
                    className="w-fit shrink-0"
                  >
                    <Badge
                      variant="secondary"
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-primary"
                    >
                      <Sparkles className="size-3 shrink-0" aria-hidden />
                      Búsqueda semántica
                    </Badge>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </Card>
        </motion.div>

        {isSearchMode && searchIsError && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: PAGE_EASE }}
          >
            <Card className="mt-6 rounded-3xl border-destructive/25 bg-destructive/5">
              <CardContent className="flex gap-3 py-4 sm:py-5">
                <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
                <div className="min-w-0">
                  <p className="text-sm text-destructive">
                    {searchError instanceof Error ? searchError.message : 'Error en la búsqueda'}
                  </p>
                  {searchError instanceof ApiError && searchError.status === 503 ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Define{' '}
                      <code className="rounded bg-muted px-1">AZURE_OPENAI_DEPLOYMENT_EMBEDDINGS</code>{' '}
                      o <code className="rounded bg-muted px-1">EMBEDDING_MODEL</code> en el backend.
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {displayLoading && (
          <motion.div
            variants={skeletonStagger}
            initial="hidden"
            animate="show"
            className="mt-8 grid gap-3"
          >
            {[1, 2, 3].map(i => (
              <motion.div key={i} variants={skeletonItem}>
                <Skeleton className="h-24 w-full rounded-2xl" />
              </motion.div>
            ))}
          </motion.div>
        )}

        {!isSearchMode && isError && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: PAGE_EASE }}
          >
            <Card className="mt-8 rounded-3xl border-destructive/25 bg-destructive/5">
              <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-3">
                  <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
                  <p className="text-sm text-destructive">
                    {error instanceof Error ? error.message : 'No se pudieron cargar las ideas'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-full sm:w-auto"
                  onClick={() => void refetch()}
                >
                  Reintentar
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {!displayLoading &&
          !isSearchMode &&
          !isError &&
          ideas &&
          ideas.length === 0 &&
          !searchInput.trim() && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: PAGE_EASE }}
            >
            <Card className="mt-8 rounded-3xl border-dashed border-border/80 bg-muted/10">
              <CardContent className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
                  <Lightbulb className="size-7 stroke-[1.5]" aria-hidden />
                </div>
                <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                  Aún no tienes ideas. Captura la primera y empieza a refinarla.
                </p>
                <Link
                  to="/ideas/new"
                  state={{ from: '/ideas' }}
                  className={cn(buttonVariants(), 'rounded-full')}
                >
                  Capturar idea
                </Link>
              </CardContent>
            </Card>
            </motion.div>
          )}

        {!displayLoading && isSearchMode && !searchIsError && displayIdeas.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: PAGE_EASE }}
          >
          <Card className="mt-8 rounded-3xl border-dashed border-border/80 bg-muted/10">
            <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
                <Search className="size-7 stroke-[1.5]" aria-hidden />
              </div>
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                Ninguna idea indexada coincide con esa búsqueda. Prueba otras palabras o espera a que
                se generen embeddings.
              </p>
            </CardContent>
          </Card>
          </motion.div>
        )}

        {!displayLoading &&
          (!isSearchMode ? !isError && ideas && ideas.length > 0 : !searchIsError) &&
          displayIdeas.length > 0 && (
            <motion.ul
              variants={listContainer}
              initial="hidden"
              animate="show"
              className="mt-8 grid gap-3"
            >
              {displayIdeas.map(idea => (
                <motion.li
                  key={idea.id}
                  variants={listItem}
                  className="min-w-0"
                  whileHover={{ y: -2 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                >
                  <Card
                    className={cn(
                      'rounded-2xl border-border/80 shadow-sm transition-[border-color,box-shadow,background-color] duration-300',
                      'hover:border-primary/20 hover:bg-muted/20 hover:shadow-md',
                      highlightId === idea.id && 'ring-2 ring-primary/45 shadow-md',
                    )}
                  >
                    <CardContent className="p-0">
                      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <Link
                          to={`/ideas/${encodeURIComponent(idea.id)}`}
                          state={{ from: '/ideas' }}
                          aria-label={`Abrir ficha: ${idea.title}`}
                          className={cn(
                            'min-w-0 flex-1 rounded-xl p-1 -m-1',
                            'outline-none',
                            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                          )}
                        >
                          <p className="font-medium text-foreground">{idea.title}</p>
                          {idea.summary ? (
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                              {idea.summary}
                            </p>
                          ) : null}
                          <div className="mt-2 flex flex-wrap gap-2">
                            {idea.sector ? (
                              <Badge variant="secondary" className="rounded-full capitalize">
                                {idea.sector}
                              </Badge>
                            ) : null}
                            <Badge variant="outline" className="rounded-full">
                              {idea.status}
                            </Badge>
                            {idea.validationScore != null && idea.status === 'VALIDATED' ? (
                              <Badge className="rounded-full bg-accent/15 text-accent-foreground">
                                Score {idea.validationScore}
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {formatDate(idea.createdAt)}
                          </p>
                        </Link>
                        {idea.status === 'DRAFT' ? (
                          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-full"
                              onClick={() => {
                                void queryClient.removeQueries({
                                  queryKey: ['refine-questions', idea.id],
                                })
                                setRefineIdeaId(idea.id)
                              }}
                            >
                              Refinar
                            </Button>
                          </div>
                        ) : null}
                      </div>
                      <div
                        className={cn(
                          'border-t border-border/80 px-4 pb-4 pt-3 transition-colors duration-300',
                          similarFor === idea.id && 'bg-muted/25',
                        )}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-expanded={similarFor === idea.id}
                          className="h-9 gap-1.5 rounded-full px-3 text-xs text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground"
                          onClick={() => setSimilarFor(s => (s === idea.id ? null : idea.id))}
                        >
                          <span>{similarFor === idea.id ? 'Ocultar relacionadas' : 'Ideas relacionadas'}</span>
                          <ChevronDown
                            className={cn(
                              'size-3.5 shrink-0 opacity-70 transition-transform duration-200 ease-out',
                              similarFor === idea.id && 'rotate-180',
                            )}
                            aria-hidden
                          />
                        </Button>
                        <AnimatePresence initial={false}>
                          {similarFor === idea.id ? (
                            <motion.div
                              key={`related-wrap-${idea.id}`}
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              transition={{ duration: 0.22, ease: PAGE_EASE }}
                            >
                              <IdeaRelatedList ideaId={idea.id} open />
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </div>
                    </CardContent>
                  </Card>
                </motion.li>
              ))}
            </motion.ul>
          )}
      </main>
    </div>
  )
}
