"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
exports.hasAzureOpenAIConfig = hasAzureOpenAIConfig;
exports.validateCriticalEnv = validateCriticalEnv;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/**
 * Secretos y despliegue. Los nombres de **deployment** en Azure pueden
 * diferir del ID del modelo; valores por tarea con fallback al chat común.
 */
exports.env = {
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
    UPLOAD_DIR: process.env.UPLOAD_DIR,
    MAX_UPLOAD_MB: process.env.MAX_UPLOAD_MB,
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
    TWITTER_BEARER_TOKEN: process.env.TWITTER_BEARER_TOKEN,
    NODE_ENV: process.env.NODE_ENV,
};
function hasAzureOpenAIConfig() {
    return (exports.env.AZURE_OPENAI_ENDPOINT.trim().length > 0 &&
        exports.env.AZURE_OPENAI_API_KEY.trim().length > 0 &&
        exports.env.AZURE_OPENAI_DEPLOYMENT_CHAT.trim().length > 0);
}
const REQUIRED_ENV_KEYS = [
    'AZURE_OPENAI_API_KEY',
    'AZURE_OPENAI_DEPLOYMENT_CHAT',
    'AZURE_OPENAI_ENDPOINT',
    'JWT_SECRET',
    'DATABASE_URL',
];
function validateCriticalEnv() {
    const missingKeys = REQUIRED_ENV_KEYS.filter((key) => {
        const value = exports.env[key];
        return typeof value !== 'string' || value.trim().length === 0;
    });
    if (missingKeys.length > 0) {
        throw new Error(`Missing required environment variables: ${missingKeys.join(', ')}. ` +
            'Set them before starting the backend.');
    }
}
