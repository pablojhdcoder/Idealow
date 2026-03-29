import { env, validateCriticalEnv } from './config/env'
import { AI_ALIGNED_MAX_UPLOAD_MB } from './lib/uploadLimits'

validateCriticalEnv()

function resolveMaxUploadMb(): number {
  const raw = env.MAX_UPLOAD_MB?.trim()
  if (!raw) return AI_ALIGNED_MAX_UPLOAD_MB
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return AI_ALIGNED_MAX_UPLOAD_MB
  /** No permitir subidas que luego la IA no pueda ingerir (visión con base64 es el cuello de botella). */
  return Math.min(n, AI_ALIGNED_MAX_UPLOAD_MB)
}

const parseTrustProxy = (value: string | undefined): boolean | number | string => {
  if (!value) {
    return false
  }
  const normalized = value.trim().toLowerCase()
  if (normalized === 'true') {
    return true
  }
  if (normalized === 'false') {
    return false
  }
  const maybeNumber = Number(value)
  if (Number.isInteger(maybeNumber) && maybeNumber >= 0) {
    return maybeNumber
  }
  return value
}

const azureEndpoint = env.AZURE_OPENAI_ENDPOINT.trim().replace(/\/$/, '')
const azureChatDeployment = env.AZURE_OPENAI_DEPLOYMENT_CHAT.trim()
const azureEmbeddingsDeployment =
  env.AZURE_OPENAI_DEPLOYMENT_EMBEDDINGS.trim() || env.EMBEDDING_MODEL.trim()
const embeddingDimensionsRaw = env.EMBEDDING_DIMENSIONS.trim()
const embeddingDimensions =
  embeddingDimensionsRaw.length > 0
    ? Number(embeddingDimensionsRaw)
    : 1536

/** Máx. distancia coseno (pgvector `<=>`) para considerar un match semántico. Por defecto ~sim ≥ 0,66. */
function resolveSemanticMaxCosineDistance(): number {
  const raw = env.SEMANTIC_MAX_COSINE_DISTANCE.trim()
  const n = raw.length > 0 ? Number(raw) : NaN
  const fallback = 0.34
  const v = Number.isFinite(n) ? n : fallback
  return Math.min(0.55, Math.max(0.18, v))
}

/** Orígenes permitidos para CORS (cookies). Lista separada por comas en `CORS_ORIGIN`. */
export const parseCorsOrigins = (raw: string | undefined): string[] => {
  const fallback = ['http://localhost:3000']
  if (typeof raw !== 'string' || !raw.trim()) {
    return fallback
  }
  const list = raw
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0)
  return list.length > 0 ? list : fallback
}

export const config = {
  port: env.PORT || 3001,
  corsOrigins: parseCorsOrigins(env.CORS_ORIGIN),
  databaseUrl: env.DATABASE_URL!,
  jwtSecret: env.JWT_SECRET!,
  jwtIssuer: env.JWT_ISSUER || 'idealow2-backend',
  jwtAudience: env.JWT_AUDIENCE || 'idealow2-frontend',
  trustProxy: parseTrustProxy(env.TRUST_PROXY),
  uploadDir: env.UPLOAD_DIR || './uploads',
  maxUploadMb: resolveMaxUploadMb(),
  /** YouTube Data API: cuota gratuita con clave en Google Cloud. */
  youtubeApiKey: env.YOUTUBE_API_KEY || '',
  nodeEnv: env.NODE_ENV || 'development',
  azure: {
    endpoint: azureEndpoint,
    apiKey: env.AZURE_OPENAI_API_KEY.trim(),
    apiVersion: env.OPENAI_API_VERSION.trim() || '2024-12-01-preview',
    deploymentChat: azureChatDeployment,
    deploymentExtraction: env.AZURE_OPENAI_DEPLOYMENT_EXTRACTION.trim() || azureChatDeployment,
    deploymentSuggestions: env.AZURE_OPENAI_DEPLOYMENT_SUGGESTIONS.trim() || azureChatDeployment,
    deploymentVision: env.AZURE_OPENAI_DEPLOYMENT_VISION.trim() || azureChatDeployment,
    deploymentWhisper: env.AZURE_OPENAI_DEPLOYMENT_WHISPER.trim(),
    deploymentEmbeddings: azureEmbeddingsDeployment,
  },
  embeddingDimensions: Number.isFinite(embeddingDimensions) ? embeddingDimensions : 1536,
  /** Máx. `embedding <=> query` para incluir filas (ideas más lejanas se descartan). */
  semanticMaxCosineDistance: resolveSemanticMaxCosineDistance(),
}

export function hasEmbeddingsConfig(): boolean {
  return (
    config.azure.endpoint.length > 0 &&
    config.azure.apiKey.length > 0 &&
    config.azure.deploymentEmbeddings.length > 0
  )
}
