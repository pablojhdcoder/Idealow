import { AzureOpenAI } from 'openai'
import { config } from '../config'

let client: AzureOpenAI | null = null

/** Cliente singleton; el nombre del deployment se pasa en cada llamada (`model`). */
export function getAzureOpenAIClient(): AzureOpenAI {
  if (!client) {
    client = new AzureOpenAI({
      endpoint: config.azure.endpoint,
      apiKey: config.azure.apiKey,
      apiVersion: config.azure.apiVersion,
    })
  }
  return client
}
