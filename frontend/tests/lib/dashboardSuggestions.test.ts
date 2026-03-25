import { describe, expect, it } from 'vitest'
import {
  buildNewIdeaStarterContent,
  DASHBOARD_STARTERS,
  getDashboardStarterById,
  pickRandomStarters,
} from '@/lib/dashboardSuggestions'

describe('buildNewIdeaStarterContent', () => {
  it('incluye una línea base breve y espacio para que el usuario complete', () => {
    const text = buildNewIdeaStarterContent('Una app de prueba para freelancers.')
    expect(text).toContain('Idea base:')
    expect(text).toContain('Una app de prueba para freelancers.')
    expect(text).toContain('Añade lo que quieras')
    expect(text.length).toBeLessThan(500)
  })
})

describe('getDashboardStarterById', () => {
  it('resuelve starters del dashboard', () => {
    expect(getDashboardStarterById('creators-time')?.sector).toBe('productivity')
    expect(getDashboardStarterById('events-niche')?.sector).toBe('entertainment')
    expect(getDashboardStarterById('no-existe')).toBeUndefined()
  })
})

describe('pickRandomStarters', () => {
  it('devuelve el número pedido de starters distintos del pool de 9', () => {
    const picked = pickRandomStarters(3)
    expect(picked).toHaveLength(3)
    const ids = picked.map(p => p.id)
    expect(new Set(ids).size).toBe(3)
    for (const p of picked) {
      expect(DASHBOARD_STARTERS.some(s => s.id === p.id)).toBe(true)
    }
  })

  it('con count=9 devuelve exactamente una vez cada starter', () => {
    const picked = pickRandomStarters(9)
    expect(picked).toHaveLength(9)
    expect(new Set(picked.map(p => p.id)).size).toBe(9)
  })
})
