import { useEffect, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  const [url, setUrl] = useState<string | null>(comment.user.avatarUrl)

  useEffect(() => {
    if (comment.user.avatarUrl) return
    let active = true
    void (async () => {
      const u = await getUserAvatarUrl({
        id: comment.user.username,
        fullName: comment.user.username,
      })
      if (active && u) setUrl(u)
    })()
    return () => {
      active = false
    }
  }, [comment.user.avatarUrl, comment.user.username])

  if (url) {
    return (
      <img src={url} alt="" className="size-8 shrink-0 rounded-full object-cover ring-2 ring-border" />
    )
  }
  return <div className="size-8 shrink-0 rounded-full bg-muted" />
}

type Props = {
  ideaId: string
  enabled: boolean
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
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Cargando comentarios…
      </div>
    )
  }

  if (q.isError) {
    return <p className="text-sm text-destructive">No se pudieron cargar los comentarios.</p>
  }

  if (flat.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aún no hay comentarios con texto. Vota y opcionalmente deja un mensaje (máx. 280 caracteres).
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {flat.map(c => (
          <li key={c.id} className="flex gap-3 rounded-2xl border border-border/80 bg-muted/20 p-3">
            <CommentAvatar comment={c} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-sm font-medium text-foreground">{c.user.username}</span>
                <span className="text-[10px] text-muted-foreground">{formatDate(c.createdAt)}</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {c.vote}
                </span>
              </div>
              {c.comment ? (
                <p className="mt-1 text-sm text-foreground">{c.comment}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {q.hasNextPage ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full rounded-2xl"
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
