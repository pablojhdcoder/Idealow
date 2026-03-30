import { useEffect, useState } from 'react'
import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { AlertCircle, Search, Sparkles, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AppShellHeader from '@/components/layout/AppShellHeader'
import { IdeaFlashcardCard } from '@/components/ideas/IdeaFlashcardCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageBackButton } from '@/components/ui/page-back-button'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchFeed, type FeedFilter, type FeedResponse, type FeedSort } from '@/lib/api/feed'
import { ApiError } from '@/lib/api/client'
import { appPageMainClassName } from '@/lib/appPageLayout'
import { cn } from '@/lib/utils'

const SECTORS = [
  { value: '', label: 'Todos los sectores' },
  { value: 'tech', label: 'Tecnología' },
  { value: 'health', label: 'Salud' },
  { value: 'finance', label: 'Finanzas' },
  { value: 'education', label: 'Educación' },
  { value: 'travel', label: 'Viajes' },
  { value: 'food', label: 'Comida' },
  { value: 'sports', label: 'Deportes' },
  { value: 'entertainment', label: 'Entretenimiento' },
  { value: 'productivity', label: 'Productividad' },
  { value: 'other', label: 'Otro' },
] as const

const feedGridContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.06 },
  },
}

const feedGridItem = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 380, damping: 28 },
  },
}

/**
 * Grid fluido: columnas más anchas que 14rem para tarjetas legibles; reparte con 1fr sin huecos laterales.
 */
const FEED_CARD_GRID_CLASS =
  'grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,17.5rem),1fr))]'

/** Tarjetas más altas y con un poco más de aire que el default del componente. */
const FEED_FLASHCARD_CLASS = 'max-w-none w-full h-[264px] p-5'
const FEED_SKELETON_H_CLASS = 'h-[264px]'

const FEED_TABS = [
  { id: 'all' as const, label: 'Todas', filter: 'all' as FeedFilter, sort: 'new' as FeedSort },
  {
    id: 'strong',
    label: 'Señal fuerte',
    filter: 'strong' as FeedFilter,
    sort: 'new' as FeedSort,
  },
  { id: 'score', label: 'Por score', filter: 'all' as FeedFilter, sort: 'score' as FeedSort },
  { id: 'votes', label: 'Más votadas', filter: 'all' as FeedFilter, sort: 'votes' as FeedSort },
] as const

export default function Feed() {
  const navigate = useNavigate()
  const [sort, setSort] = useState<FeedSort>('new')
  const [filter, setFilter] = useState<FeedFilter>('all')
  const [sector, setSector] = useState('')
  const [qInput, setQInput] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(qInput.trim()), 300)
    return () => clearTimeout(t)
  }, [qInput])

  type FeedPageParam = string | number | undefined

  const q = useInfiniteQuery<
    FeedResponse,
    Error,
    InfiniteData<FeedResponse>,
    readonly [string, FeedSort, FeedFilter, string, string],
    FeedPageParam
  >({
    queryKey: ['feed', sort, filter, sector, debouncedQ] as const,
    queryFn: async ({ pageParam }) => {
      if (sort === 'votes') {
        const page = typeof pageParam === 'number' ? pageParam : 1
        return fetchFeed({
          sort: 'votes',
          filter,
          sector: sector || undefined,
          q: debouncedQ || undefined,
          page,
          limit: 12,
        })
      }
      const cursor = typeof pageParam === 'string' ? pageParam : undefined
      return fetchFeed({
        sort,
        filter,
        sector: sector || undefined,
        q: debouncedQ || undefined,
        cursor,
        limit: 12,
      })
    },
    initialPageParam: undefined as FeedPageParam,
    getNextPageParam: last => {
      if (sort === 'votes') return last.nextPage ?? undefined
      return last.nextCursor ?? undefined
    },
  })

  const flat = q.data?.pages.flatMap((p: FeedResponse) => p.items) ?? []

  return (
    <div className="min-h-screen bg-background">
      <AppShellHeader />
      <main className={appPageMainClassName('py-8')}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <PageBackButton label="Volver al dashboard" to="/dashboard" />
        </motion.div>
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'mt-5',
            'relative overflow-hidden rounded-3xl border border-primary/15',
            'bg-gradient-to-br from-primary/[0.09] via-background to-amber-500/[0.06]',
            'px-5 py-7 shadow-sm sm:px-8 sm:py-9',
          )}
        >
          <div
            className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-primary/10 blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
                <Users className="size-6" strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <h1 className="font-serif text-3xl tracking-tight text-foreground sm:text-4xl">
                  Comunidad
                </h1>
                <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  Descubre ideas validadas, vota y comenta. Abre una tarjeta para ver el detalle y
                  unirte a la conversación.
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        <Card className="mt-6 rounded-3xl border-border/80 p-3 shadow-sm sm:mt-7 sm:p-4">
          <h2 className="sr-only">Explorar el feed</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2">
            <div
              className="flex flex-wrap gap-1.5"
              role="group"
              aria-label="Orden y filtro del feed"
            >
              {FEED_TABS.map(tab => {
                const active = sort === tab.sort && filter === tab.filter
                return (
                  <Button
                    key={tab.id}
                    type="button"
                    size="sm"
                    variant={active ? 'default' : 'outline'}
                    className="h-8 rounded-full px-3 text-xs"
                    aria-pressed={active}
                    onClick={() => {
                      setFilter(tab.filter)
                      setSort(tab.sort)
                    }}
                  >
                    {tab.label}
                  </Button>
                )
              })}
            </div>

            <div
              className="hidden h-7 w-px shrink-0 self-stretch bg-border/70 sm:block sm:self-center"
              aria-hidden
            />

            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
              <div className="min-w-0 sm:w-[11.5rem] sm:shrink-0">
                <Label htmlFor="feed-sector" className="sr-only">
                  Sector
                </Label>
                <select
                  id="feed-sector"
                  value={sector}
                  onChange={e => setSector(e.target.value)}
                  className={cn(
                    'border-input bg-background h-9 w-full rounded-xl border px-2.5 text-sm shadow-xs',
                    'outline-none transition-[color,box-shadow]',
                    'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
                  )}
                >
                  {SECTORS.map(s => (
                    <option key={s.value || 'all'} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative min-w-0 flex-1 basis-[min(100%,12rem)]">
                <Label htmlFor="feed-search" className="sr-only">
                  Buscar en título o resumen
                </Label>
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="feed-search"
                  className="h-9 rounded-xl pl-9 text-sm"
                  placeholder="Título, resumen o captura…"
                  value={qInput}
                  onChange={e => setQInput(e.target.value)}
                />
              </div>
            </div>
          </div>
        </Card>

        {q.isError && (
          <Card className="mt-8 rounded-3xl border-destructive/25 bg-destructive/5">
            <CardContent className="flex gap-3 py-4 sm:py-5">
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
              <p className="text-sm text-destructive">
                {q.error instanceof ApiError ? q.error.message : 'No se pudo cargar el feed'}
              </p>
            </CardContent>
          </Card>
        )}

        {q.isLoading && (
          <div className={cn('mt-10', FEED_CARD_GRID_CLASS)}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton
                key={i}
                className={cn('w-full min-w-0 rounded-2xl', FEED_SKELETON_H_CLASS)}
              />
            ))}
          </div>
        )}

        {!q.isLoading && !q.isError && flat.length === 0 && (
          <Card className="mt-10 rounded-3xl border-dashed border-border/80 bg-muted/10">
            <CardContent className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
                <Sparkles className="size-7 stroke-[1.5]" />
              </div>
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                No hay ideas con estos filtros. Publica una idea validada o prueba otra vista o
                sector.
              </p>
            </CardContent>
          </Card>
        )}

        {!q.isLoading && flat.length > 0 && (
          <motion.div
            layout
            variants={feedGridContainer}
            initial="hidden"
            animate="show"
            className={cn('mt-10', FEED_CARD_GRID_CLASS)}
          >
            {flat.map(item => (
              <motion.div
                key={item.id}
                variants={feedGridItem}
                className="min-w-0"
              >
                <IdeaFlashcardCard
                  className={FEED_FLASHCARD_CLASS}
                  flashcard={item}
                  onOpen={() =>
                    navigate(`/ideas/${encodeURIComponent(item.id)}`, { state: { from: '/feed' } })
                  }
                />
              </motion.div>
            ))}
          </motion.div>
        )}

        {q.hasNextPage ? (
          <div className="mt-10 flex justify-center pb-2">
            <Button
              type="button"
              variant="outline"
              className="min-w-[10rem] rounded-full border-border/80"
              disabled={q.isFetchingNextPage}
              onClick={() => void q.fetchNextPage()}
            >
              {q.isFetchingNextPage ? 'Cargando…' : 'Cargar más'}
            </Button>
          </div>
        ) : null}
      </main>
    </div>
  )
}
