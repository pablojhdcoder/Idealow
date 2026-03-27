import { config } from '../../config'
import { getAzureOpenAIClient } from '../../lib/azureOpenAI'

const MAX_INPUT_CHARS = 30_000

/**
 * Genera un vector de embedding con el deployment de Azure configurado.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const trimmed = text.trim().slice(0, MAX_INPUT_CHARS)
  if (!trimmed) {
    throw new Error('Empty text for embedding')
  }

  const client = getAzureOpenAIClient()
  const res = await client.embeddings.create({
    model: config.azure.deploymentEmbeddings,
    input: trimmed,
  })

  const vec = res.data[0]?.embedding
  if (!vec || !Array.isArray(vec)) {
    throw new Error('Embedding API returned no vector')
  }

  const expected = config.embeddingDimensions
  if (vec.length !== expected) {
    throw new Error(`Embedding dimension mismatch: got ${vec.length}, expected ${expected}`)
  }

  return vec
}
