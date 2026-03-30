import type { Verdict } from '@/types/flashcard'

export function inferVerdictFromScore(score: number | null | undefined): Verdict {
  if (score == null || Number.isNaN(score)) return 'NO_SIGNAL'
  if (score >= 75) return 'STRONG_SIGNAL'
  if (score >= 55) return 'MODERATE_SIGNAL'
  if (score >= 35) return 'WEAK_SIGNAL'
  return 'NO_SIGNAL'
}

export const verdictScoreConfig: Record<
  Verdict,
  { bg: string; text: string; label: string }
> = {
  STRONG_SIGNAL: { bg: '#DCFCE7', text: '#166534', label: 'Señal fuerte' },
  MODERATE_SIGNAL: { bg: '#FEF9C3', text: '#854D0E', label: 'Señal moderada' },
  WEAK_SIGNAL: { bg: '#FEE2E2', text: '#991B1B', label: 'Señal débil' },
  NO_SIGNAL: { bg: '#F3F4F6', text: '#374151', label: 'Sin señal' },
}
