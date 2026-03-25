import { Router } from 'express'

const router = Router()

router.get('/', (_req, res) => {
  res.json({
    items: [],
    nextCursor: null,
    _meta: {
      phase: 'stub',
      message:
        'Feed comunitario pendiente de implementación (roadmap: flashcards + votos).',
    },
  })
})

export default router
