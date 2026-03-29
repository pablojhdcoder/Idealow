import { useEffect, useState, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Lightbulb, ThumbsDown, ThumbsUp } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { postIdeaFeedback } from '@/lib/api/ideas'
import { ApiError } from '@/lib/api/client'
import type { CommunityVotes, IdeaFlashcard } from '@/types/flashcard'

type Vote = 'USEFUL' | 'INTERESTING' | 'NOT_USEFUL'

type Props = {
  ideaId: string
  disabled?: boolean
  initialVotes: CommunityVotes
  initialMyVote: IdeaFlashcard['myVote']
  queryKeysToInvalidate: readonly (readonly unknown[])[]
}

function countForVote(votes: CommunityVotes, v: Vote): number {
  if (v === 'USEFUL') return votes.useful
  if (v === 'INTERESTING') return votes.interesting
  return votes.notUseful
}

function applyOptimistic(
  votes: CommunityVotes,
  prevVote: Vote | null,
  nextVote: Vote,
): CommunityVotes {
  const next = { ...votes }
  if (prevVote === 'USEFUL') next.useful = Math.max(0, next.useful - 1)
  if (prevVote === 'INTERESTING') next.interesting = Math.max(0, next.interesting - 1)
  if (prevVote === 'NOT_USEFUL') next.notUseful = Math.max(0, next.notUseful - 1)
  if (nextVote === 'USEFUL') next.useful += 1
  if (nextVote === 'INTERESTING') next.interesting += 1
  if (nextVote === 'NOT_USEFUL') next.notUseful += 1
  return next
}

export function VoteButtons({
  ideaId,
  disabled,
  initialVotes,
  initialMyVote,
  queryKeysToInvalidate,
}: Props) {
  const queryClient = useQueryClient()
  const [votes, setVotes] = useState(initialVotes)
  const [myVote, setMyVote] = useState<Vote | null>(initialMyVote)

  useEffect(() => {
    setVotes(initialVotes)
    setMyVote(initialMyVote)
  }, [
    initialVotes.useful,
    initialVotes.interesting,
    initialVotes.notUseful,
    initialMyVote,
  ])

  const mutation = useMutation({
    mutationFn: (vote: Vote) => postIdeaFeedback(ideaId, { vote }),
    onMutate: async vote => {
      const prevVotes = votes
      const prevMy = myVote
      setVotes(v => applyOptimistic(v, prevMy, vote))
      setMyVote(vote)
      return { prevVotes, prevMy }
    },
    onError: (err: unknown, _vote, ctx) => {
      if (ctx) {
        setVotes(ctx.prevVotes)
        setMyVote(ctx.prevMy)
      }
      if (err instanceof ApiError) {
        toast.error(err.message)
        return
      }
      toast.error('No se pudo registrar el voto')
    },
    onSuccess: () => {
      for (const key of queryKeysToInvalidate) {
        void queryClient.invalidateQueries({ queryKey: [...key] })
      }
    },
  })

  const busy = mutation.isPending

  const btn = (vote: Vote, label: string, icon: ReactNode) => {
    const active = myVote === vote
    const count = countForVote(votes, vote)
    return (
      <motion.div key={vote} layout>
        <Button
          type="button"
          variant={active ? 'default' : 'outline'}
          size="sm"
          className="h-auto min-h-[2.5rem] flex-1 flex-col gap-0.5 rounded-full border-border/60 py-1.5"
          disabled={disabled || busy}
          onClick={() => mutation.mutate(vote)}
        >
          <span className="flex items-center justify-center gap-1 text-[11px] font-medium">
            {icon}
            {label}
          </span>
          <motion.span
            key={count}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="text-[10px] font-medium tabular-nums text-muted-foreground"
          >
            {count}
          </motion.span>
        </Button>
      </motion.div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
      {btn('USEFUL', 'Útil', <ThumbsUp className="size-3.5" />)}
      {btn('INTERESTING', 'Interesante', <Lightbulb className="size-3.5" />)}
      {btn('NOT_USEFUL', 'Poco útil', <ThumbsDown className="size-3.5" />)}
    </div>
  )
}
