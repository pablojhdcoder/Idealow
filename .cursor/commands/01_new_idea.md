# Command: Create New Idea Endpoint

## Task
Endpoint completo para recibir input del usuario en cualquier formato y devolver una idea estructurada lista para el wizard de refinamiento.

---

## Endpoint

```
POST /api/ideas/create
Content-Type: application/json
Body: { content?: string, fileId?: string, sector?: string }
Authorization: Bearer <token>
```

Si hay archivo, primero se sube al backend en `POST /api/files/upload` (multipart/form-data).
Ese endpoint guarda el archivo en disco y crea un registro en tabla `files`. Luego se usa `fileId` en este endpoint.

---

## `backend/src/routes/ideas.ts`

```ts
import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { validateBody } from '../middleware/validate'
import { createIdeaSchema } from '../schemas/idea'
import { extractIdea } from '../services/ai/extractor'
import { processMedia } from '../services/media/processor'
import { prisma } from '../lib/prisma'

const router = Router()

router.post('/create', requireAuth, validateBody(createIdeaSchema), async (req, res) => {
  try {
    const { content, fileId, sector } = req.body
    const userId = req.user!.userId

    // Normalizar input a texto
    let rawText = content || ''
    if (fileId) {
      const file = await prisma.file.findFirst({ where: { id: fileId, userId } })
      if (!file) return res.status(404).json({ error: 'File not found' })
      rawText = await processMedia(file.filepath)
    }

    if (!rawText.trim()) {
      return res.status(422).json({ error: 'No content provided' })
    }

    // Extraer idea estructurada con OpenRouter
    const extracted = await extractIdea(rawText, sector)

    // Guardar en DB
    const idea = await prisma.idea.create({
      data: {
        userId,
        title:            extracted.title,
        summary:          extracted.elevator_pitch,
        rawContent:       rawText,
        sector:           extracted.sector || sector,
        status:           'DRAFT',
        files: fileId ? { connect: [{ id: fileId }] } : undefined,
      },
    })

    res.json({
      ideaId:    idea.id,
      extracted,
      nextStep:  'refine',
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to create idea', details: err })
  }
})

export default router
```

---

## `backend/src/services/media/processor.ts`

```ts
import axios from 'axios'

export async function processMedia(filePathOrUrl: string): Promise<string> {
  const ext = filePathOrUrl.split('.').pop()?.toLowerCase() || ''

  // URL → scrape texto
  if (filePathOrUrl.startsWith('http') && !['mp3','mp4','wav','jpg','jpeg','png','webp'].includes(ext)) {
    const { data } = await axios.get(filePathOrUrl, { timeout: 10000 })
    // Extraer texto del HTML básico
    return data.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 5000)
  }

  // Audio/Video → transcribir con OpenAI Whisper
  if (['mp3', 'mp4', 'wav', 'm4a', 'ogg'].includes(ext)) {
    const OpenAI = require('openai')
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const response = await axios.get(filePathOrUrl, { responseType: 'stream' })
    const transcription = await openai.audio.transcriptions.create({
      file: response.data,
      model: 'whisper-1',
    })
    return transcription.text
  }

  // Imagen → modelo multimodal vía OpenRouter
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
    const OpenAI = require('openai')
    const client = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
    })
    const imgResponse = await axios.get(filePathOrUrl, { responseType: 'arraybuffer' })
    const base64 = Buffer.from(imgResponse.data).toString('base64')
    const mediaType = ext === 'png' ? 'image/png' : 'image/jpeg'
    const msg = await client.chat.completions.create({
      model: process.env.MULTIMODAL_MODEL || 'qwen/qwen2.5-vl-72b-instruct:free',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Extract all text and describe any diagrams or sketches shown. Return plain text only.' },
          { type: 'image_url', image_url: { url: `data:${mediaType};base64,${base64}` } }
        ]
      }],
      temperature: 0.2,
    })
    return msg.choices[0]?.message?.content || ''
  }

  return ''
}
```

---

## `backend/src/services/ai/extractor.ts`

```ts
import OpenAI from 'openai'
import { config } from '../../config'

const client = new OpenAI({
  apiKey: config.openrouterApiKey,
  baseURL: 'https://openrouter.ai/api/v1',
})

const SYSTEM_PROMPT = `You are an idea extraction specialist. Take raw unstructured input 
(notes, transcripts, articles, voice memos) and extract the core idea.

Return ONLY a JSON object with this exact structure, no markdown, no explanation:
{
  "title": "5-8 word title that captures the essence",
  "problem": "The specific problem this solves (1-2 sentences)",
  "solution": "The proposed solution (1-2 sentences)",
  "target_audience": "Who would use this (specific, not generic)",
  "sector": "One of: tech, health, finance, education, travel, food, sports, entertainment, productivity, other",
  "elevator_pitch": "One sentence. What it is, for whom, why it matters.",
  "confidence": 0.0,
  "search_keywords": ["keyword1", "keyword2"]
}

Rules:
- NEVER invent details not present in the input
- Be specific, not generic
- If input is too vague, set confidence below 0.4
- search_keywords: 5-8 terms useful for market research`

export async function extractIdea(rawText: string, hintSector?: string) {
  const response = await client.chat.completions.create({
    model: process.env.EXTRACTION_MODEL || 'openai/gpt-oss-20b:free',
    messages: [{
      role: 'system', content: SYSTEM_PROMPT
    }, {
      role: 'user', content: `Extract the idea from this input:\n\n${rawText}${hintSector ? `\n\nHint: user is interested in the ${hintSector} sector` : ''}`
    }],
    temperature: 0.2,
  })

  const text = response.choices[0]?.message?.content || '{}'
  return JSON.parse(text)
}
```

---

## `backend/src/schemas/idea.ts`

```ts
import { z } from 'zod'

export const createIdeaSchema = z.object({
  content:  z.string().optional(),
  fileId:   z.string().uuid().optional(),
  sector:   z.string().optional(),
}).refine(data => data.content || data.fileId, {
  message: 'Either content or fileId must be provided',
})
```

---

## `backend/src/middleware/validate.ts`

```ts
import { Request, Response, NextFunction } from 'express'
import { ZodSchema } from 'zod'

export const validateBody = (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      return res.status(422).json({
        error: 'Validation failed',
        details: result.error.flatten(),
      })
    }
    req.body = result.data
    next()
  }
```

---

## `backend/src/lib/prisma.ts`

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query'] : [],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

---

## Archivos a crear
- `backend/src/routes/files.ts`
- `backend/src/routes/ideas.ts`
- `backend/src/services/ai/extractor.ts`
- `backend/src/services/media/processor.ts`
- `backend/src/schemas/idea.ts`
- `backend/src/middleware/validate.ts`
- `backend/src/middleware/auth.ts`
- `backend/src/middleware/errors.ts`
- `backend/src/lib/prisma.ts`
- `backend/src/lib/jwt.ts`
- `backend/prisma/schema.prisma`
