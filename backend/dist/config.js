"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: process.env.PORT || 3001,
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    jwtSecret: process.env.JWT_SECRET,
    openrouterApiKey: process.env.OPENROUTER_API_KEY,
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 25),
    youtubeApiKey: process.env.YOUTUBE_API_KEY || '',
    twitterToken: process.env.TWITTER_BEARER_TOKEN || '',
    nodeEnv: process.env.NODE_ENV || 'development',
};
