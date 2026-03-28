import { z } from 'zod'

export const abandonUploadsBodySchema = z.object({
  fileIds: z.array(z.string().uuid()).min(1).max(50),
})

export type AbandonUploadsBody = z.infer<typeof abandonUploadsBodySchema>
