"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.parseCorsOrigins = void 0;
exports.hasEmbeddingsConfig = hasEmbeddingsConfig;
const env_1 = require("./config/env");
const uploadLimits_1 = require("./lib/uploadLimits");
(0, env_1.validateCriticalEnv)();
function resolveMaxUploadMb() {
    const raw = env_1.env.MAX_UPLOAD_MB?.trim();
    if (!raw)
        return uploadLimits_1.AI_ALIGNED_MAX_UPLOAD_MB;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0)
        return uploadLimits_1.AI_ALIGNED_MAX_UPLOAD_MB;
    /** No permitir subidas que luego la IA no pueda ingerir (visión con base64 es el cuello de botella). */
    return Math.min(n, uploadLimits_1.AI_ALIGNED_MAX_UPLOAD_MB);
}
const parseTrustProxy = (value) => {
    if (!value) {
        return false;
    }
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
        return true;
    }
    if (normalized === 'false') {
        return false;
    }
    const maybeNumber = Number(value);
    if (Number.isInteger(maybeNumber) && maybeNumber >= 0) {
        return maybeNumber;
    }
    return value;
};
const azureEndpoint = env_1.env.AZURE_OPENAI_ENDPOINT.trim().replace(/\/$/, '');
const azureChatDeployment = env_1.env.AZURE_OPENAI_DEPLOYMENT_CHAT.trim();
const azureEmbeddingsDeployment = env_1.env.AZURE_OPENAI_DEPLOYMENT_EMBEDDINGS.trim() || env_1.env.EMBEDDING_MODEL.trim();
const embeddingDimensionsRaw = env_1.env.EMBEDDING_DIMENSIONS.trim();
const embeddingDimensions = embeddingDimensionsRaw.length > 0
    ? Number(embeddingDimensionsRaw)
    : 1536;
/** Orígenes permitidos para CORS (cookies). Lista separada por comas en `CORS_ORIGIN`. */
const parseCorsOrigins = (raw) => {
    const fallback = ['http://localhost:3000'];
    if (typeof raw !== 'string' || !raw.trim()) {
        return fallback;
    }
    const list = raw
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    return list.length > 0 ? list : fallback;
};
exports.parseCorsOrigins = parseCorsOrigins;
exports.config = {
    port: env_1.env.PORT || 3001,
    corsOrigins: (0, exports.parseCorsOrigins)(env_1.env.CORS_ORIGIN),
    databaseUrl: env_1.env.DATABASE_URL,
    jwtSecret: env_1.env.JWT_SECRET,
    jwtIssuer: env_1.env.JWT_ISSUER || 'idealow2-backend',
    jwtAudience: env_1.env.JWT_AUDIENCE || 'idealow2-frontend',
    trustProxy: parseTrustProxy(env_1.env.TRUST_PROXY),
    uploadDir: env_1.env.UPLOAD_DIR || './uploads',
    maxUploadMb: resolveMaxUploadMb(),
    /** YouTube Data API: cuota gratuita con clave en Google Cloud. */
    youtubeApiKey: env_1.env.YOUTUBE_API_KEY || '',
    nodeEnv: env_1.env.NODE_ENV || 'development',
    azure: {
        endpoint: azureEndpoint,
        apiKey: env_1.env.AZURE_OPENAI_API_KEY.trim(),
        apiVersion: env_1.env.OPENAI_API_VERSION.trim() || '2024-12-01-preview',
        deploymentChat: azureChatDeployment,
        deploymentExtraction: env_1.env.AZURE_OPENAI_DEPLOYMENT_EXTRACTION.trim() || azureChatDeployment,
        deploymentSuggestions: env_1.env.AZURE_OPENAI_DEPLOYMENT_SUGGESTIONS.trim() || azureChatDeployment,
        deploymentVision: env_1.env.AZURE_OPENAI_DEPLOYMENT_VISION.trim() || azureChatDeployment,
        deploymentWhisper: env_1.env.AZURE_OPENAI_DEPLOYMENT_WHISPER.trim(),
        deploymentEmbeddings: azureEmbeddingsDeployment,
    },
    embeddingDimensions: Number.isFinite(embeddingDimensions) ? embeddingDimensions : 1536,
};
function hasEmbeddingsConfig() {
    return (exports.config.azure.endpoint.length > 0 &&
        exports.config.azure.apiKey.length > 0 &&
        exports.config.azure.deploymentEmbeddings.length > 0);
}
