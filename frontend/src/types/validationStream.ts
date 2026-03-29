export type SourceKey = 'reddit' | 'trends' | 'competitors' | 'social' | 'news'

export type SocialEvidenceRef = {
  title: string
  url: string
}

export type AiPlatformEstimate = {
  signal: number
  synthetic_findings: string
  /** Enlaces de búsqueda en la red (resultados reales al abrir). */
  evidence_refs?: SocialEvidenceRef[]
}

export type AiSocialSearchPayload = {
  x?: AiPlatformEstimate
  instagram?: AiPlatformEstimate
  tiktok?: AiPlatformEstimate
}
