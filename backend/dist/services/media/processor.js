"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processMedia = processMedia;
const axios_1 = __importDefault(require("axios"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const openai_1 = __importDefault(require("openai"));
const uploads_1 = require("openai/uploads");
const config_1 = require("../../config");
const isMediaUrl = (value) => value.startsWith('http://') || value.startsWith('https://');
const mediaExtensions = ['mp3', 'mp4', 'wav', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'm4a', 'ogg'];
const textMimeTypes = new Set(['text/plain', 'text/markdown']);
const audioMimeTypes = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/ogg']);
const imageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const pdfMimeTypes = new Set(['application/pdf']);
async function processMedia(filePathOrUrl, mimeType) {
    const ext = path_1.default.extname(filePathOrUrl).replace('.', '').toLowerCase();
    const isUrl = isMediaUrl(filePathOrUrl);
    if (isUrl && !mediaExtensions.includes(ext)) {
        const { data } = await axios_1.default.get(filePathOrUrl, { timeout: 10000 });
        return data.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 5000);
    }
    if (['mp3', 'mp4', 'wav', 'm4a', 'ogg'].includes(ext) || (mimeType ? audioMimeTypes.has(mimeType) : false)) {
        const audioClient = new openai_1.default({
            apiKey: config_1.config.openrouterApiKey,
            baseURL: 'https://openrouter.ai/api/v1',
        });
        const bytes = isUrl
            ? Buffer.from((await axios_1.default.get(filePathOrUrl, { responseType: 'arraybuffer' })).data)
            : await promises_1.default.readFile(filePathOrUrl);
        const transcription = await audioClient.audio.transcriptions.create({
            file: await (0, uploads_1.toFile)(bytes, `audio.${ext || 'mp3'}`),
            model: process.env.TRANSCRIPTION_MODEL || 'openai/whisper-1',
        });
        return transcription.text;
    }
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) || (mimeType ? imageMimeTypes.has(mimeType) : false)) {
        const visionClient = new openai_1.default({
            apiKey: config_1.config.openrouterApiKey,
            baseURL: 'https://openrouter.ai/api/v1',
        });
        const bytes = isUrl
            ? Buffer.from((await axios_1.default.get(filePathOrUrl, { responseType: 'arraybuffer' })).data)
            : await promises_1.default.readFile(filePathOrUrl);
        const base64 = bytes.toString('base64');
        const mediaType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        const msg = await visionClient.chat.completions.create({
            model: process.env.MULTIMODAL_MODEL || 'qwen/qwen2.5-vl-72b-instruct:free',
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: 'Extract all text and describe any diagrams or sketches shown. Return plain text only.',
                        },
                        {
                            type: 'image_url',
                            image_url: { url: `data:${mediaType};base64,${base64}` },
                        },
                    ],
                },
            ],
            temperature: 0.2,
        });
        const content = msg.choices[0]?.message?.content;
        return typeof content === 'string' ? content : '';
    }
    if (!isUrl && (mimeType ? textMimeTypes.has(mimeType) : true)) {
        try {
            const textFile = await promises_1.default.readFile(filePathOrUrl, 'utf8');
            return textFile.trim().slice(0, 5000);
        }
        catch {
            return '';
        }
    }
    if (mimeType && pdfMimeTypes.has(mimeType)) {
        throw new Error('UNSUPPORTED_MEDIA: PDF extraction is not implemented yet');
    }
    throw new Error('UNSUPPORTED_MEDIA: Unsupported media format');
}
