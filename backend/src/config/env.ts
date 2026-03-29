import dotenv from 'dotenv'

dotenv.config()

/**
 * Secretos y despliegue. Los nombres de **deployment** en Azure pueden
 * diferir del ID del modelo; valores por tarea con fallback al chat común.
 */
export const env = {
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_ISSUER: process.env.JWT_ISSUER,
  JWT_AUDIENCE: process.env.JWT_AUDIENCE,
  TRUST_PROXY: process.env.TRUST_PROXY,
  AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT ?? '',
  AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY ?? '',
  OPENAI_API_VERSION: process.env.OPENAI_API_VERSION ?? '',
  AZURE_OPENAI_DEPLOYMENT_CHAT: process.env.AZURE_OPENAI_DEPLOYMENT_CHAT ?? '',
  AZURE_OPENAI_DEPLOYMENT_EXTRACTION: process.env.AZURE_OPENAI_DEPLOYMENT_EXTRACTION ?? '',
  AZURE_OPENAI_DEPLOYMENT_SUGGESTIONS: process.env.AZURE_OPENAI_DEPLOYMENT_SUGGESTIONS ?? '',
  AZURE_OPENAI_DEPLOYMENT_VISION: process.env.AZURE_OPENAI_DEPLOYMENT_VISION ?? '',
  AZURE_OPENAI_DEPLOYMENT_WHISPER: process.env.AZURE_OPENAI_DEPLOYMENT_WHISPER ?? '',
  /** Nombre del deployment de embeddings en Azure (p. ej. text-embedding-3-small). */
  AZURE_OPENAI_DEPLOYMENT_EMBEDDINGS: process.env.AZURE_OPENAI_DEPLOYMENT_EMBEDDINGS ?? '',
  /** Alias legado en .env.example; se usa si no hay AZURE_OPENAI_DEPLOYMENT_EMBEDDINGS. */
  EMBEDDING_MODEL: process.env.EMBEDDING_MODEL ?? '',
  EMBEDDING_DIMENSIONS: process.env.EMBEDDING_DIMENSIONS ?? '',
  /**
   * Umbral de distancia coseno pgvector (`<=>`): menor = más estricto.
   * Equivale a similitud coseno ≥ (1 − valor) con vectores normalizados.
   * Rango recomendado en .env: 0.28–0.42 (por defecto se aplica en config.ts).
   */
  SEMANTIC_MAX_COSINE_DISTANCE: process.env.SEMANTIC_MAX_COSINE_DISTANCE ?? '',
  UPLOAD_DIR: process.env.UPLOAD_DIR,
  MAX_UPLOAD_MB: process.env.MAX_UPLOAD_MB,
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
  NODE_ENV: process.env.NODE_ENV,
  /** Origen del frontend para CORS (cookies + credenciales). Ej. https://app.tudominio.com */
  CORS_ORIGIN: process.env.CORS_ORIGIN,
} as const

export function hasAzureOpenAIConfig(): boolean {
  return (
    env.AZURE_OPENAI_ENDPOINT.trim().length > 0 &&
    env.AZURE_OPENAI_API_KEY.trim().length > 0 &&
    env.AZURE_OPENAI_DEPLOYMENT_CHAT.trim().length > 0
  )
}

const REQUIRED_ENV_KEYS = [
  'AZURE_OPENAI_API_KEY',
  'AZURE_OPENAI_DEPLOYMENT_CHAT',
  'AZURE_OPENAI_ENDPOINT',
  'JWT_SECRET',
  'DATABASE_URL',
] as const
type RequiredEnvKey = (typeof REQUIRED_ENV_KEYS)[number]

export function validateCriticalEnv(): void {
  const missingKeys = REQUIRED_ENV_KEYS.filter((key: RequiredEnvKey) => {
    const value = env[key]
    return typeof value !== 'string' || value.trim().length === 0
  })

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingKeys.join(', ')}. ` +
        'Set them before starting the backend.',
    )
  }
}
