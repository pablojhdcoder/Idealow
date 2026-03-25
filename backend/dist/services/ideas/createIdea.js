"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIdeaFromInput = createIdeaFromInput;
const openai_1 = require("openai");
const zod_1 = require("zod");
const config_1 = require("../../config");
const prisma_1 = require("../../lib/prisma");
const processor_1 = require("../media/processor");
const httpError_1 = require("../../lib/httpError");
const extractor_1 = require("../ai/extractor");
const processor_2 = require("../media/processor");
/** Evita payloads enormes a Azure (context / coste). El resto se descarta para extracción. */
const MAX_RAW_TEXT_CHARS_FOR_EXTRACTION = 100000;
/**
 * Orquesta: resolver texto (contenido directo o uno/varios archivos), extraer idea con IA y persistir.
 */
async function createIdeaFromInput(input) {
    const { userId, content, fileId, fileIds, sector } = input;
    const mergedIds = [...new Set([...(fileIds ?? []), ...(fileId ? [fileId] : [])])];
    const fromContent = (content ?? '').trim();
    const fromFiles = [];
    for (const id of mergedIds) {
        const file = await prisma_1.prisma.file.findFirst({ where: { id, userId } });
        if (!file) {
            throw new httpError_1.HttpError(404, 'File not found', 'IDEAS_FILE_NOT_FOUND');
        }
        if (file.ideaId != null) {
            throw new httpError_1.HttpError(409, 'File is already attached to an idea', 'IDEAS_FILE_ALREADY_ATTACHED');
        }
        try {
            fromFiles.push((await (0, processor_2.processMedia)(file.filepath, file.mimeType)).trim());
        }
        catch (e) {
            if (e instanceof Error && e.message.startsWith('UNSUPPORTED_MEDIA:')) {
                throw new httpError_1.HttpError(422, e.message.replace('UNSUPPORTED_MEDIA:', '').trim(), 'IDEAS_UNSUPPORTED_MEDIA');
            }
            if (e instanceof Error && e.message === processor_1.WHISPER_DEPLOYMENT_MISSING) {
                throw new httpError_1.HttpError(503, 'Audio transcription is not configured (set AZURE_OPENAI_DEPLOYMENT_WHISPER)', 'IDEAS_WHISPER_NOT_CONFIGURED');
            }
            if (e instanceof openai_1.APIError) {
                throw new httpError_1.HttpError(502, `Microsoft Foundry / Azure OpenAI error: ${e.message}`, 'IDEAS_AI_PROVIDER_ERROR');
            }
            throw e;
        }
    }
    const rawTextJoined = [fromContent, ...fromFiles].filter(Boolean).join('\n\n');
    const rawText = rawTextJoined.length > MAX_RAW_TEXT_CHARS_FOR_EXTRACTION
        ? rawTextJoined.slice(0, MAX_RAW_TEXT_CHARS_FOR_EXTRACTION)
        : rawTextJoined;
    if (!rawText.trim()) {
        throw new httpError_1.HttpError(422, 'No content provided', 'IDEAS_NO_CONTENT');
    }
    let extracted;
    try {
        extracted = await (0, extractor_1.extractIdea)(rawText, sector);
    }
    catch (e) {
        if (e instanceof zod_1.ZodError) {
            throw new httpError_1.HttpError(502, 'Idea extraction failed: invalid AI response', 'IDEAS_AI_INVALID_RESPONSE', config_1.config.nodeEnv === 'development' ? e.flatten() : undefined);
        }
        if (e instanceof Error && e.message === 'Extractor returned non-JSON response') {
            throw new httpError_1.HttpError(502, 'Idea extraction failed: model did not return JSON', 'IDEAS_AI_NON_JSON_RESPONSE');
        }
        if (e instanceof openai_1.APIError) {
            throw new httpError_1.HttpError(502, `Microsoft Foundry / Azure OpenAI error: ${e.message}`, 'IDEAS_AI_PROVIDER_ERROR');
        }
        throw e;
    }
    const idea = await prisma_1.prisma.idea.create({
        data: {
            userId,
            title: extracted.title,
            summary: extracted.elevator_pitch,
            rawContent: rawText,
            sector: extracted.sector || sector,
            status: 'DRAFT',
            /** Base para el wizard de refinamiento (mismos campos que devuelve el extractor). */
            refinedContent: { ...extracted },
            files: mergedIds.length > 0 ? { connect: mergedIds.map((id) => ({ id })) } : undefined,
        },
    });
    return {
        ideaId: idea.id,
        extracted,
        nextStep: 'refine',
    };
}
