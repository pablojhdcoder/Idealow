import { useEffect, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tag } from '@/components/ui/tag'
import { fetchIdeaFeedbackComments } from '@/lib/api/ideas'
import { getUserAvatarUrl } from '@/lib/avatar'
import type { FeedbackComment } from '@/types/flashcard'

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

function CommentAvatar({ comment }: { comment: FeedbackComment }) {
  const serverUrl = comment.user.avatarUrl?.trim() || null
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null)

  useEffect(() => {
    if (serverUrl) {
      setFallbackUrl(null)
      return
    }
    let active = true
    void (async () => {
      const u = await getUserAvatarUrl({ id: comment.user.id })
      if (active && u) setFallbackUrl(u)
    })()
    return () => {
      active = false
    }
  }, [serverUrl, comment.user.id])

  const url = serverUrl ?? fallbackUrl

  if (url) {
    return (
      <img src={url} alt="" className="size-7 shrink-0 rounded-full object-cover ring-1 ring-border/60" />
    )
  }
  return <div className="size-7 shrink-0 rounded-full bg-muted/80" />
}

type Props = {
  ideaId: string
  enabled: boolean
}

function voteBadgeClass(vote: string): string {
  if (vote === 'USEFUL') return 'bg-emerald-500/12 text-emerald-700'
  if (vote === 'INTERESTING') return 'bg-amber-500/12 text-amber-800'
  if (vote === 'NOT_USEFUL') return 'bg-red-500/12 text-red-700'
  return 'bg-primary/10 text-primary'
}

function formatVoteLabel(vote: string): string {
  if (vote === 'USEFUL') return 'Útil'
  if (vote === 'INTERESTING') return 'Interesante'
  if (vote === 'NOT_USEFUL') return 'Poco útil'
  return vote
}

export function CommentList({ ideaId, enabled }: Props) {
  const q = useInfiniteQuery({
    queryKey: ['idea-feedback', ideaId] as const,
    queryFn: async ({ pageParam }) =>
      fetchIdeaFeedbackComments(ideaId, {
        cursor: pageParam as string | undefined,
        limit: 15,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: last => last.nextCursor ?? undefined,
    enabled: enabled && Boolean(ideaId),
  })

  const flat = q.data?.pages.flatMap(p => p.comments) ?? []

  if (!enabled) return null

  if (q.isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        Cargando…
      </div>
    )
  }

  if (q.isError) {
    return <p className="text-sm text-destructive">No se pudieron cargar los comentarios.</p>
  }

  if (flat.length === 0) {
    return (
      <p className="text-xs leading-relaxed text-muted-foreground">
        Nadie ha comentado aún. Tras votar puedes añadir un mensaje breve.
      </p>
    )
  }

  return (
    <div className="space-y-0">
      <ul className="divide-y divide-border/50">
        {flat.map(c => (
          <li key={c.id} className="flex gap-3 py-3 first:pt-0">
            <CommentAvatar comment={c} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-foreground">{c.user.username}</span>
                  <Tag size="xs" className={voteBadgeClass(c.vote)}>
                  {formatVoteLabel(c.vote)}
                  </Tag>
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {formatDate(c.createdAt)}
                </span>
              </div>
              {c.comment ? (
                <p className="mt-1 text-sm leading-relaxed text-foreground">{c.comment}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {q.hasNextPage ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 w-full rounded-full text-xs text-muted-foreground"
          disabled={q.isFetchingNextPage}
          onClick={() => void q.fetchNextPage()}
        >
          {q.isFetchingNextPage ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Cargando…
            </>
          ) : (
            'Cargar más'
          )}
        </Button>
      ) : null}
    </div>
  )
}
