import type { Prisma } from '@prisma/client'
import type { ValidationIdeaInput } from './types'

type RefinedBlock = {
  elevator_pitch?: string
  problem_statement?: string
  search_keywords?: string[]
}

type ExtractorBlock = {
  elevator_pitch?: string
  problem?: string
  search_keywords?: string[]
}

function asRecord(v: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return v as Record<string, unknown>
  }
  return null
}

/**
 * `refinedContent` mezcla campos del extractor y, tras el wizard, un bloque `refined` con problem_statement.
 */
export function refinedContentToValidationInput(
  refinedContent: Prisma.JsonValue | null,
  fallbackSummary: string | null,
): ValidationIdeaInput | null {
  const root = asRecord(refinedContent)
  if (!root) {
    return null
  }

  const refined = asRecord(root.refined as Prisma.JsonValue)
  const fromRefined: RefinedBlock = refined
    ? {
        elevator_pitch: typeof refined.elevator_pitch === 'string' ? refined.elevator_pitch : undefined,
        problem_statement:
          typeof refined.problem_statement === 'string' ? refined.problem_statement : undefined,
        search_keywords: Array.isArray(refined.search_keywords)
          ? refined.search_keywords.filter((k): k is string => typeof k === 'string')
          : undefined,
      }
    : {}

  const ext = root as unknown as ExtractorBlock
  const elevator =
    fromRefined.elevator_pitch?.trim() ||
    (typeof ext.elevator_pitch === 'string' ? ext.elevator_pitch.trim() : '') ||
    (fallbackSummary ?? '').trim()

  const problem =
    fromRefined.problem_statement?.trim() ||
    (typeof ext.problem === 'string' ? ext.problem.trim() : '') ||
    elevator

  const keywords =
    fromRefined.search_keywords && fromRefined.search_keywords.length > 0
      ? fromRefined.search_keywords
      : Array.isArray(ext.search_keywords)
        ? ext.search_keywords.filter((k): k is string => typeof k === 'string')
        : []

  if (!elevator && !problem) {
    return null
  }

  const safeKeywords =
    keywords.length > 0
      ? keywords.slice(0, 12)
      : elevator
        .split(/\s+/)
        .filter(w => w.length > 3)
        .slice(0, 8)

  return {
    elevator_pitch: elevator || problem,
    problem_statement: problem || elevator,
    search_keywords: safeKeywords.length > 0 ? safeKeywords : ['startup', 'idea'],
  }
}
