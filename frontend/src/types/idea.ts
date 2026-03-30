/** Respuesta estructurada del extractor (backend / Azure OpenAI). */
export type ExtractedIdea = {
  title: string
  problem: string
  solution: string
  target_audience: string
  sector: string
  elevator_pitch: string
  confidence: number
  search_keywords: string[]
}

export type CreateIdeaResponse = {
  ideaId: string
  extracted: ExtractedIdea
  nextStep: 'refine'
}

export type IdeaSummary = {
  id: string
  title: string
  summary: string | null
  sector: string | null
  status: string
  isPublished: boolean
  validationScore: number | null
  /** null hasta confirmar la revisión post-wizard (antes de lanzar validación). */
  refinementConfirmedAt: string | null
  createdAt: string
}

export type RefinementQuestionOption = {
  id: string
  label: string
  detail?: string | null
}

export type RefinementQuestion = {
  id: string
  question: string
  context: string
  options: RefinementQuestionOption[]
}

export type RefinementQuestionsResponse = {
  questions: RefinementQuestion[]
}

export type RefineAnswersPayload = { questionId: string; answer: string }[]

export type SubmitRefinementResponse = {
  idea: {
    id: string
    title: string
    summary: string | null
    status: string
    sector: string | null
    refinedContent?: unknown
    [key: string]: unknown
  }
  nextStep: 'review_refined'
}

export type ConfirmRefinementResponse = {
  idea: {
    id: string
    title: string
    summary: string | null
    status: string
    [key: string]: unknown
  }
  nextStep: 'validation'
}
