import { motion } from 'framer-motion'
import { sectorPillStyle } from '@/lib/sectorColors'
import { inferVerdictFromScore, verdictScoreConfig } from '@/lib/flashcardVerdict'
import type { CommunityVotes, IdeaFlashcard, Verdict } from '@/types/flashcard'
import { getUserAvatarUrl } from '@/lib/avatar'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export type FlashcardCardModel = Pick<
  IdeaFlashcard,
  | 'refinedTitle'
  | 'elevatorPitch'
  | 'sector'
  | 'validationScore'
  | 'verdict'
  | 'author'
  | 'communityVotes'
  | 'isPublished'
>

type Props = {
  flashcard: FlashcardCardModel
  onOpen: () => void
  className?: string
}

function AuthorChip({ author }: { author: FlashcardCardModel['author'] }) {
  const serverUrl = author.avatarUrl?.trim() || null
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null)

  useEffect(() => {
    if (serverUrl) {
      setFallbackUrl(null)
      return
    }
    let active = true
    void (async () => {
      const u = await getUserAvatarUrl({ id: author.id })
      if (active && u) setFallbackUrl(u)
    })()
    return () => {
      active = false
    }
  }, [serverUrl, author.id])

  const url = serverUrl ?? fallbackUrl

  return (
    <div className="mt-3 flex items-center gap-2">
      {url ? (
        <img src={url} alt="" className="size-7 rounded-full object-cover ring-2 ring-border" />
      ) : (
        <div className="size-7 rounded-full bg-muted" />
      )}
      <span className="truncate text-xs font-medium text-foreground">{author.username}</span>
    </div>
  )
}

function VoteFooter({ votes }: { votes: CommunityVotes }) {
  const total = votes.useful + votes.interesting + votes.notUseful
  if (total === 0) {
    return <p className="mt-2 text-[10px] text-muted-foreground">Sin votos aún</p>
  }
  return (
    <div className="mt-2 flex gap-1 text-[10px] text-muted-foreground">
      <span>👍 {votes.useful}</span>
      <span>·</span>
      <span>💡 {votes.interesting}</span>
      <span>·</span>
      <span>👎 {votes.notUseful}</span>
    </div>
  )
}

export function IdeaFlashcardCard({ flashcard, onOpen, className }: Props) {
  const verdict: Verdict = flashcard.verdict ?? inferVerdictFromScore(flashcard.validationScore)
  const cfg = verdictScoreConfig[verdict]
  const sector = flashcard.sector || 'other'
  const pill = sectorPillStyle(sector)

  return (
    <motion.button
      type="button"
      layout
      aria-label={`Ver detalle: ${flashcard.refinedTitle}`}
      onClick={onOpen}
      whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.12)' }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'flex h-[200px] w-full max-w-[320px] flex-col rounded-2xl border border-border bg-card p-4 text-left shadow-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="inline-flex max-w-[60%] truncate rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize"
          style={pill}
        >
          {sector}
        </span>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ backgroundColor: cfg.bg, color: cfg.text }}
        >
          {flashcard.validationScore}
        </span>
      </div>
      <h3 className="mt-2 line-clamp-2 font-serif text-xl leading-tight text-foreground">
        {flashcard.refinedTitle}
      </h3>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{flashcard.elevatorPitch}</p>
      {flashcard.isPublished ? (
        <div className="mt-auto pt-2">
          <AuthorChip author={flashcard.author} />
          <VoteFooter votes={flashcard.communityVotes} />
        </div>
      ) : null}
    </motion.button>
  )
}
