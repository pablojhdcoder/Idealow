"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WHISPER_DEPLOYMENT_MISSING = void 0;
exports.processMedia = processMedia;
const axios_1 = __importDefault(require("axios"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const uploads_1 = require("openai/uploads");
const pdf_parse_1 = require("pdf-parse");
const config_1 = require("../../config");
const azureOpenAI_1 = require("../../lib/azureOpenAI");
const chatCompletionSamplingFallback_1 = require("../ai/chatCompletionSamplingFallback");
const openaiMessageText_1 = require("../ai/openaiMessageText");
exports.WHISPER_DEPLOYMENT_MISSING = 'WHISPER_DEPLOYMENT_MISSING';
const isMediaUrl = (value) => value.startsWith('http://') || value.startsWith('https://');
const mediaExtensions = ['mp3', 'mp4', 'wav', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'm4a', 'ogg', 'pdf'];
const textMimeTypes = new Set(['text/plain', 'text/markdown']);
const audioMimeTypes = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/ogg']);
const imageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const pdfMimeTypes = new Set(['application/pdf']);
async function processMedia(filePathOrUrl, mimeType) {
    const ext = path_1.default.extname(filePathOrUrl).replace('.', '').toLowerCase();
    const isUrl = isMediaUrl(filePathOrUrl);
    const isPdf = ext === 'pdf' || (mimeType ? pdfMimeTypes.has(mimeType) : false);
    if (isUrl && !mediaExtensions.includes(ext)) {
        const { data } = await axios_1.default.get(filePathOrUrl, { timeout: 10000 });
        return data.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 5000);
    }
    if (['mp3', 'mp4', 'wav', 'm4a', 'ogg'].includes(ext) || (mimeType ? audioMimeTypes.has(mimeType) : false)) {
        if (!config_1.config.azure.deploymentWhisper) {
            throw new Error(exports.WHISPER_DEPLOYMENT_MISSING);
        }
        const client = (0, azureOpenAI_1.getAzureOpenAIClient)();
        const bytes = isUrl
            ? Buffer.from((await axios_1.default.get(filePathOrUrl, { responseType: 'arraybuffer' })).data)
            : await promises_1.default.readFile(filePathOrUrl);
        const transcription = await client.audio.transcriptions.create({
            file: await (0, uploads_1.toFile)(bytes, `audio.${ext || 'mp3'}`),
            model: config_1.config.azure.deploymentWhisper,
        });
        return transcription.text;
    }
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) || (mimeType ? imageMimeTypes.has(mimeType) : false)) {
        const client = (0, azureOpenAI_1.getAzureOpenAIClient)();
        const bytes = isUrl
            ? Buffer.from((await axios_1.default.get(filePathOrUrl, { responseType: 'arraybuffer' })).data)
            : await promises_1.default.readFile(filePathOrUrl);
        const base64 = bytes.toString('base64');
        const mediaType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        const msg = await (0, chatCompletionSamplingFallback_1.chatCompletionsCreateWithSamplingFallback)(client, {
            model: config_1.config.azure.deploymentVision,
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
        return (0, openaiMessageText_1.completionContentToPlainText)(msg.choices[0]?.message?.content);
    }
    if (isPdf) {
        const bytes = isUrl
            ? Buffer.from((await axios_1.default.get(filePathOrUrl, { responseType: 'arraybuffer' })).data)
            : await promises_1.default.readFile(filePathOrUrl);
        const parser = new pdf_parse_1.PDFParse({ data: bytes });
        const parsed = await parser.getText();
        await parser.destroy();
        return (parsed.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 5000);
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
    throw new Error('UNSUPPORTED_MEDIA: Unsupported media format');
}
