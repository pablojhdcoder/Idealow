import { env, validateCriticalEnv } from './config/env'

validateCriticalEnv()

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
  maxUploadMb: Number(env.MAX_UPLOAD_MB || 25),
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
  },
}
