import { z } from 'zod'
import { APIError } from 'openai'
import { config } from '../../config'
import { HttpError } from '../../lib/httpError'
import { getAzureOpenAIClient } from '../../lib/azureOpenAI'
import { chatCompletionsCreateWithSamplingFallback } from './chatCompletionSamplingFallback'
import { completionContentToPlainText } from './openaiMessageText'

/** Alineado con "Capturar idea": nota breve para que el extractor IA derive título, sector, etc. */
const profileIdeaSchema = z.object({
  content: z.string().trim().min(50).max(520),
})

const SYSTEM_PROMPT = `Eres un asistente que escribe el CONTENIDO del formulario "Capturar idea" en Idealow.
Ese campo es una nota rápida o borrador (como si el usuario hubiera pegado notas): sirve para que otro paso de la app extraiga con IA título, sector y estructura. No es un informe ni un plan de validación.

Devuelve SOLO JSON válido (sin markdown), exactamente:
{
  "content": "string"
}

Reglas del texto en "content":
- Español, tono natural, 2 a 4 frases cortas (como máximo ~350 caracteres de contenido útil; nunca superes 520 caracteres en total).
- Debe sonar a nota propia: qué problema ves, qué harías (producto o enfoque concreto) y en una frase quién lo usaría. Sin secciones tipo "Problema:" / "Solución:" salvo que sea una sola línea cada una.
- NO incluyas: calendarios por días, listas de pasos largas, planes de hackathon detallados, métricas inventadas, ni "cómo validar en una semana" extendido. Máximo una frase opcional y breve sobre siguiente paso si encaja.
- Ajusta la idea a los sectores, objetivo y nivel del usuario (perfil en el mensaje user en JSON).
- Un solo párrafo o dos párrafos muy cortos; sin viñetas largas.`

const stripMarkdownCodeFence = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed.startsWith('```')) {
    return trimmed
  }
  return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

type UserProfileForSuggestion = {
  username: string
  sectors: string[]
  goal: string
  experienceLevel: string
}

export async function generateProfileIdeaSuggestion(profile: UserProfileForSuggestion): Promise<string> {
  const client = getAzureOpenAIClient()
  try {
    const response = await chatCompletionsCreateWithSamplingFallback(client, {
      model: config.azure.deploymentSuggestions,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: JSON.stringify({
            username: profile.username,
            sectors: profile.sectors,
            goal: profile.goal,
            experienceLevel: profile.experienceLevel,
          }),
        },
      ],
      temperature: 0.3,
    })

    const text = completionContentToPlainText(response.choices[0]?.message?.content) || '{}'
    const cleaned = stripMarkdownCodeFence(text)
    const parsed = JSON.parse(cleaned) as unknown
    const result = profileIdeaSchema.safeParse(parsed)
    if (!result.success) {
      throw new HttpError(
        502,
        'La IA devolvió una sugerencia inválida',
        'USERS_SUGGESTION_AI_INVALID',
        config.nodeEnv === 'development' ? result.error.flatten() : undefined,
      )
    }
    return result.data.content
  } catch (error) {
    if (error instanceof HttpError) {
      throw error
    }
    if (error instanceof APIError) {
      throw new HttpError(
        502,
        `Error de Microsoft Foundry / Azure OpenAI: ${error.message}`,
        'USERS_SUGGESTION_AI_PROVIDER_ERROR',
      )
    }
    throw new HttpError(502, 'No se pudo generar una idea con IA', 'USERS_SUGGESTION_AI_FAILED')
  }
}
