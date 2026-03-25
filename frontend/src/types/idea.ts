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
  nextStep: 'validation'
}
