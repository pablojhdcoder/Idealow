export type Verdict = 'STRONG_SIGNAL' | 'MODERATE_SIGNAL' | 'WEAK_SIGNAL' | 'NO_SIGNAL'

export type CommunityVotes = {
  useful: number
  interesting: number
  notUseful: number
}

export type FlashcardAuthor = {
  /** Para avatar Dicebear sin foto subida: misma semilla que en perfil/header. */
  id: string
  username: string
  avatarUrl: string | null
}

export type CompetitorPublic = {
  name: string
  url?: string
  description?: string
  strength?: string
  weakness?: string
  approximateUsers?: string
}

export type ValidationBreakdownEntry = {
  score: number | null
  weight: number
  contribution: number | null
}

export type IdeaFlashcard = {
  id: string
  refinedTitle: string
  elevatorPitch: string
  sector: string
  validationScore: number
  verdict: Verdict
  problemStatement: string
  solution: string
  targetCustomer: string
  monetization: string
  mvpFeature: string
  distribution: string
  whyNow: string
  biggestRisk: string
  competitors: CompetitorPublic[]
  validationBreakdown: Record<string, ValidationBreakdownEntry> | null
  isPublished: boolean
  publishedAt: string | null
  author: FlashcardAuthor
  communityVotes: CommunityVotes
  createdAt: string
  status: string
  myVote: 'USEFUL' | 'INTERESTING' | 'NOT_USEFUL' | null
}

export type IdeaAttachment = {
  id: string
  originalName: string
  mimeType: string
  sizeBytes: number
  createdAt: string
}

export type IdeaFlashcardDetailResponse = {
  flashcard: IdeaFlashcard
  isOwner: boolean
  attachments: IdeaAttachment[]
  /** Solo propietario: payload completo de validación persistida (JSON de `validationData`). */
  validationSnapshot?: unknown | null
}

export type FeedbackComment = {
  id: string
  comment: string | null
  vote: string
  createdAt: string
  user: FlashcardAuthor
}
