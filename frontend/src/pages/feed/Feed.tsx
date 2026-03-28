import { useEffect, useState } from 'react'
import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Users } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import AppShellHeader from '@/components/layout/AppShellHeader'
import { IdeaFlashcardCard } from '@/components/ideas/IdeaFlashcardCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchFeed, type FeedFilter, type FeedResponse, type FeedSort } from '@/lib/api/feed'
import { ApiError } from '@/lib/api/client'
import { Card } from '@/components/ui/card'

const SECTORS = [
  { value: '', label: 'Todos los sectores' },
  { value: 'tech', label: 'Tech' },
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
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users className="size-5" />
          </div>
          <div>
            <h1 className="font-serif text-3xl text-foreground">Comunidad</h1>
            <p className="text-sm text-muted-foreground">
              Ideas publicadas por la comunidad · vota y comenta
            </p>
          </div>
        </div>

        <Card className="mt-6 space-y-4 rounded-3xl p-4 sm:p-6">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'all' as const, label: 'Todas', filter: 'all' as FeedFilter, sort: 'new' as FeedSort },
                {
                  id: 'strong',
                  label: 'Strong signal',
                  filter: 'strong' as FeedFilter,
                  sort: 'new' as FeedSort,
                },
                { id: 'score', label: 'Por score', filter: 'all' as FeedFilter, sort: 'score' as FeedSort },
                { id: 'votes', label: 'Más votadas', filter: 'all' as FeedFilter, sort: 'votes' as FeedSort },
              ] as const
            ).map(tab => (
              <Button
                key={tab.id}
                type="button"
                size="sm"
                variant={sort === tab.sort && filter === tab.filter ? 'default' : 'outline'}
                className="rounded-full"
                onClick={() => {
                  setFilter(tab.filter)
                  setSort(tab.sort)
                }}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="text-sm text-muted-foreground sm:w-40">Sector</label>
            <select
              value={sector}
              onChange={e => setSector(e.target.value)}
              className="border-input bg-background h-11 w-full max-w-xs rounded-2xl border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {SECTORS.map(s => (
                <option key={s.value || 'all'} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Input
              className="rounded-2xl"
              placeholder="Buscar en título o resumen…"
              value={qInput}
              onChange={e => setQInput(e.target.value)}
              aria-label="Filtrar feed"
            />
          </div>
        </Card>

        {q.isError && (
          <Card className="mt-6 rounded-3xl border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm text-destructive">
              {q.error instanceof ApiError ? q.error.message : 'No se pudo cargar el feed'}
            </p>
          </Card>
        )}

        {q.isLoading && (
          <div className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="mb-4 break-inside-avoid h-[200px] w-full rounded-2xl" />
            ))}
          </div>
        )}

        {!q.isLoading && !q.isError && flat.length === 0 && (
          <Card className="mt-8 rounded-3xl border-dashed p-10 text-center">
            <p className="text-sm text-muted-foreground">
              No hay ideas publicadas con estos filtros. Sé el primero en publicar una idea validada.
            </p>
          </Card>
        )}

        {!q.isLoading && flat.length > 0 && (
          <motion.div
            layout
            className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {flat.map(item => (
              <div key={item.id} className="mb-4 break-inside-avoid flex justify-center">
                <div className="flex flex-col items-center gap-2">
                  <IdeaFlashcardCard
                    flashcard={item}
                    onOpen={() =>
                      navigate(`/ideas/${encodeURIComponent(item.id)}`, { state: { from: '/feed' } })
                    }
                  />
                  <Link
                    to={`/flashcard/${encodeURIComponent(item.id)}`}
                    className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    Abrir enlace público
                  </Link>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {q.hasNextPage ? (
          <div className="mt-8 flex justify-center">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
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
