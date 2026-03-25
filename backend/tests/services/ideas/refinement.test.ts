import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '../../../src/lib/httpError'
import { loadRefinementQuestions, submitRefinement } from '../../../src/services/ideas/refinement'

const { prismaFindFirstMock, prismaUpdateMock } = vi.hoisted(() => ({
  prismaFindFirstMock: vi.fn(),
  prismaUpdateMock: vi.fn(),
}))

const { generateQuestionsMock, synthesizeAnswersMock } = vi.hoisted(() => ({
  generateQuestionsMock: vi.fn(),
  synthesizeAnswersMock: vi.fn(),
}))

vi.mock('../../../src/lib/prisma', () => ({
  prisma: {
    idea: {
      findFirst: prismaFindFirstMock,
      update: prismaUpdateMock,
    },
  },
}))

vi.mock('../../../src/services/ai/refiner', () => ({
  generateQuestions: generateQuestionsMock,
  synthesizeAnswers: synthesizeAnswersMock,
}))

const fiveQs = () =>
  ['q1', 'q2', 'q3', 'q4', 'q5'].map(id => ({
    id,
    question: `Question ${id}`,
    context: 'ctx',
    options: [
      { id: 'a', label: 'A', detail: 'd' },
      { id: 'b', label: 'B', detail: 'd' },
      { id: 'c', label: 'C', detail: null },
      { id: 'custom', label: 'Something else', detail: null },
    ],
  }))

const synthesis = () => ({
  refined_title: 'Nuevo título',
  elevator_pitch: 'Pitch',
  problem_statement: 'P',
  solution: 'S',
  target_customer: 'T',
  monetization: 'M',
  mvp_feature: 'MV',
  distribution: 'D',
  why_now: 'W',
  biggest_risk: 'R',
  search_keywords: ['a', 'b', 'c', 'd', 'e'],
})

describe('refinement service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loadRefinementQuestions lanza 404 si la idea no existe', async () => {
    prismaFindFirstMock.mockResolvedValue(null)

    await expect(loadRefinementQuestions('user-1', '00000000-0000-4000-8000-000000000001')).rejects.toMatchObject({
      statusCode: 404,
      code: 'IDEAS_NOT_FOUND',
    })
    expect(generateQuestionsMock).not.toHaveBeenCalled()
  })

  it('loadRefinementQuestions delega en generateQuestions con datos de la idea', async () => {
    prismaFindFirstMock.mockResolvedValue({
      id: 'idea-1',
      title: 'Mi idea',
      summary: 'Resumen corto',
      sector: 'tech',
      refinedContent: {
        problem: 'Problema',
        solution: 'Solución',
        target_audience: 'Devs',
      },
    })
    const qs = { questions: fiveQs() }
    generateQuestionsMock.mockResolvedValue(qs)

    const result = await loadRefinementQuestions('user-1', 'idea-1')

    expect(result).toEqual(qs)
    expect(generateQuestionsMock).toHaveBeenCalledWith({
      title: 'Mi idea',
      problem: 'Problema',
      solution: 'Solución',
      target_audience: 'Devs',
      sector: 'tech',
    })
  })

  it('submitRefinement persiste y devuelve nextStep', async () => {
    prismaFindFirstMock.mockResolvedValue({
      id: 'idea-1',
      userId: 'user-1',
      title: 'T',
      summary: 'S',
      sector: 'tech',
      refinedContent: { problem: 'p' },
      user: { sectors: ['tech'], goal: 'SIDE_PROJECT' },
    })
    synthesizeAnswersMock.mockResolvedValue(synthesis())
    prismaUpdateMock.mockResolvedValue({
      id: 'idea-1',
      title: 'Nuevo título',
      summary: 'Pitch',
      status: 'REFINING',
    })

    const answers = [
      { questionId: 'q1', answer: 'A1' },
      { questionId: 'q2', answer: 'A2' },
    ]
    const result = await submitRefinement('user-1', 'idea-1', answers)

    expect(synthesizeAnswersMock).toHaveBeenCalled()
    expect(prismaUpdateMock).toHaveBeenCalledWith({
      where: { id: 'idea-1' },
      data: expect.objectContaining({
        title: 'Nuevo título',
        summary: 'Pitch',
        status: 'REFINING',
        refinedContent: expect.objectContaining({
          refined: synthesis(),
          wizardAnswers: answers,
        }),
      }),
    })
    expect(result.nextStep).toBe('validation')
  })

  it('submitRefinement propaga HttpError de synthesizeAnswers', async () => {
    prismaFindFirstMock.mockResolvedValue({
      id: 'idea-1',
      userId: 'user-1',
      title: 'T',
      summary: 'S',
      sector: null,
      refinedContent: {},
      user: { sectors: [], goal: 'X' },
    })
    synthesizeAnswersMock.mockRejectedValue(new HttpError(502, 'bad', 'REFINE_SYNTHESIS_INVALID'))

    await expect(submitRefinement('user-1', 'idea-1', [{ questionId: 'q1', answer: 'a' }])).rejects.toMatchObject({
      statusCode: 502,
      code: 'REFINE_SYNTHESIS_INVALID',
    })
    expect(prismaUpdateMock).not.toHaveBeenCalled()
  })
})
