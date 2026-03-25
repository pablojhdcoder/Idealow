"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const env_1 = require("./config/env");
(0, env_1.validateCriticalEnv)();
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
exports.config = {
    port: env_1.env.PORT || 3001,
    databaseUrl: env_1.env.DATABASE_URL,
    jwtSecret: env_1.env.JWT_SECRET,
    jwtIssuer: env_1.env.JWT_ISSUER || 'idealow2-backend',
    jwtAudience: env_1.env.JWT_AUDIENCE || 'idealow2-frontend',
    trustProxy: parseTrustProxy(env_1.env.TRUST_PROXY),
    uploadDir: env_1.env.UPLOAD_DIR || './uploads',
    maxUploadMb: Number(env_1.env.MAX_UPLOAD_MB || 25),
    youtubeApiKey: env_1.env.YOUTUBE_API_KEY || '',
    twitterToken: env_1.env.TWITTER_BEARER_TOKEN || '',
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
    },
};
