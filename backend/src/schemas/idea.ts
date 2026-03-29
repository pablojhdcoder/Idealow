import { z } from 'zod'

const MAX_FILES_PER_IDEA = 12

export const createIdeaSchema = z
  .object({
    content: z.string().optional(),
    /** Compatibilidad: un solo archivo */
    fileId: z.string().uuid().optional(),
    /** Varias fuentes: varios archivos ya subidos */
    fileIds: z.array(z.string().uuid()).max(MAX_FILES_PER_IDEA).optional(),
    sector: z.string().optional(),
    /** Por defecto true: visible en feed comunitario tras validar; el cliente puede enviar false. */
    isPublished: z.boolean().optional().default(true),
  })
  .refine(
    (data) => {
      const hasText = Boolean(data.content?.trim())
      const hasOne = Boolean(data.fileId)
      const hasMany = Boolean(data.fileIds && data.fileIds.length > 0)
      return hasText || hasOne || hasMany
    },
    {
      message: 'Debes enviar texto (content), fileId o al menos un fileIds',
    },
  )

export type CreateIdeaBody = z.infer<typeof createIdeaSchema>

export const listIdeasQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
})

const refineAnswerItemSchema = z.object({
  questionId: z.string().min(1).max(64),
  answer: z.string().min(1).max(8000),
})

export const refineAnswersBodySchema = z.object({
  answers: z.array(refineAnswerItemSchema).min(1).max(10),
})

export type RefineAnswersBody = z.infer<typeof refineAnswersBodySchema>

export const patchIdeaBodySchema = z.object({
  isPublished: z.boolean(),
})

export type PatchIdeaBody = z.infer<typeof patchIdeaBodySchema>

export const ideaFeedbackBodySchema = z.object({
  vote: z.enum(['USEFUL', 'INTERESTING', 'NOT_USEFUL']),
  comment: z.string().max(280).optional(),
})

export type IdeaFeedbackBody = z.infer<typeof ideaFeedbackBodySchema>

export const ideaFeedbackListQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
})

export const feedQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  sector: z.string().trim().min(1).max(32).optional(),
  sort: z.enum(['new', 'score', 'votes']).optional(),
  filter: z.enum(['all', 'strong']).optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).max(500).optional(),
})
