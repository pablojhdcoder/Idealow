import { z } from 'zod'

export const createIdeaSchema = z
  .object({
    content: z.string().optional(),
    fileId: z.string().uuid().optional(),
    sector: z.string().optional(),
  })
  .refine((data) => data.content || data.fileId, {
    message: 'Either content or fileId must be provided',
  })
