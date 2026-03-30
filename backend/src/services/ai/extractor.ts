import { z } from 'zod'
import { config } from '../../config'
import { getAzureOpenAIClient } from '../../lib/azureOpenAI'
import { chatCompletionsCreateWithSamplingFallback } from './chatCompletionSamplingFallback'
import { completionContentToPlainText } from './openaiMessageText'

const SYSTEM_PROMPT = `Eres un especialista en extracción de ideas. Toma un input crudo y no estructurado
(notas, transcripciones, artículos, notas de voz) y extrae la idea central.

Devuelve SOLO un objeto JSON con esta estructura exacta, sin markdown y sin explicación:
{
  "title": "Título de 5-8 palabras que capture la esencia",
  "problem": "El problema específico que resuelve (1-2 frases)",
  "solution": "La solución propuesta (1-2 frases)",
  "target_audience": "Quién lo usaría (específico, no genérico)",
  "sector": "Uno de: tech, health, finance, education, travel, food, sports, entertainment, productivity, other",
  "elevator_pitch": "Una frase. Qué es, para quién y por qué importa.",
  "confidence": 0.0,
  "search_keywords": ["keyword1", "keyword2"]
}

Reglas:
- NUNCA inventes detalles que no estén presentes en el input
- Sé específico, no genérico
- Si el input es demasiado vago, pon confidence por debajo de 0.4
- search_keywords: 5-8 términos útiles para investigación de mercado`

type ExtractedIdea = {
  title: string
  problem: string
  solution: string
  target_audience: string
  sector: string
  elevator_pitch: string
  confidence: number
  search_keywords: string[]
}

const extractedIdeaSchema: z.ZodType<ExtractedIdea> = z.object({
  title: z.string().min(1),
  problem: z.string().min(1),
  solution: z.string().min(1),
  target_audience: z.string().min(1),
  sector: z.string().min(1),
  elevator_pitch: z.string().min(1),
  confidence: z.number(),
  search_keywords: z.array(z.string()),
})

const stripMarkdownCodeFence = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed.startsWith('```')) {
    return trimmed
  }
  return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

export async function extractIdea(rawText: string, hintSector?: string): Promise<ExtractedIdea> {
  const client = getAzureOpenAIClient()
  const response = await chatCompletionsCreateWithSamplingFallback(client, {
    model: config.azure.deploymentExtraction,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Extrae la idea a partir de este input:\n\n${rawText}${hintSector ? `\n\nPista: al usuario le interesa el sector ${hintSector}` : ''}`,
      },
    ],
    temperature: 0.2,
  })

  const text = completionContentToPlainText(response.choices[0]?.message?.content) || '{}'
  const cleaned = stripMarkdownCodeFence(text)

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('El extractor devolvió una respuesta que no es JSON')
  }

  return extractedIdeaSchema.parse(parsed)
}
