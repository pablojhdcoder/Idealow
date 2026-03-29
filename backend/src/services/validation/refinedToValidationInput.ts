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

function pickStringLoose(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}

function pickStringArrayLoose(v: unknown): string[] | undefined {
  return Array.isArray(v) ? v.filter((k): k is string => typeof k === 'string') : undefined
}

/** Acepta snake_case (API / extractor) y camelCase por si el JSON llega transformado. */
function refinedBlockFromRecord(refined: Record<string, unknown>): RefinedBlock {
  return {
    elevator_pitch:
      pickStringLoose(refined.elevator_pitch) ?? pickStringLoose(refined.elevatorPitch),
    problem_statement:
      pickStringLoose(refined.problem_statement) ?? pickStringLoose(refined.problemStatement),
    search_keywords:
      pickStringArrayLoose(refined.search_keywords) ?? pickStringArrayLoose(refined.searchKeywords),
  }
}

function extractorFromRoot(root: Record<string, unknown>): ExtractorBlock {
  return {
    elevator_pitch: pickStringLoose(root.elevator_pitch) ?? pickStringLoose(root.elevatorPitch),
    problem: pickStringLoose(root.problem) ?? pickStringLoose(root.problemStatement),
    search_keywords:
      pickStringArrayLoose(root.search_keywords) ?? pickStringArrayLoose(root.searchKeywords),
  }
}

/** Refined primero; luego keywords del extractor que no estén ya (YouTube/validación más estables). */
function mergeSearchKeywords(refinedKw: string[] | undefined, extractorKw: string[] | undefined, max: number): string[] {
  const primary = refinedKw?.map(k => k.trim()).filter(k => k.length > 1) ?? []
  const secondary = extractorKw?.map(k => k.trim()).filter(k => k.length > 1) ?? []
  const seen = new Set<string>()
  const out: string[] = []
  const pushUnique = (arr: string[]) => {
    for (const k of arr) {
      const key = k.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(k)
      if (out.length >= max) return
    }
  }
  pushUnique(primary)
  if (out.length < max) pushUnique(secondary)
  return out
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
  const fromRefined: RefinedBlock = refined ? refinedBlockFromRecord(refined) : {}

  const ext = extractorFromRoot(root)
  const elevator =
    fromRefined.elevator_pitch?.trim() ||
    ext.elevator_pitch?.trim() ||
    (fallbackSummary ?? '').trim()

  const problem =
    fromRefined.problem_statement?.trim() ||
    ext.problem?.trim() ||
    elevator

  const keywords =
    fromRefined.search_keywords && fromRefined.search_keywords.length > 0
      ? mergeSearchKeywords(fromRefined.search_keywords, ext.search_keywords, 12)
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
