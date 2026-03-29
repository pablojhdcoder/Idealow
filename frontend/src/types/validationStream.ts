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
  /** Señal 0–100 alineada con la API de YouTube (misma forma que x/instagram/tiktok). */
  youtube?: AiPlatformEstimate
  x?: AiPlatformEstimate
  instagram?: AiPlatformEstimate
  tiktok?: AiPlatformEstimate
}
