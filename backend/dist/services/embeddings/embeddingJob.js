"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleIdeaEmbedding = scheduleIdeaEmbedding;
exports.scheduleFileEmbedding = scheduleFileEmbedding;
const prisma_1 = require("../../lib/prisma");
const logger_1 = require("../../lib/logger");
const config_1 = require("../../config");
const textForIdea_1 = require("./textForIdea");
const generateEmbedding_1 = require("./generateEmbedding");
const ideaInFlight = new Set();
const fileInFlight = new Set();
async function persistIdeaVector(ideaId, vector) {
    const v = JSON.stringify(vector);
    await prisma_1.prisma.$executeRaw `
    UPDATE "Idea" SET embedding = ${v}::vector WHERE id = ${ideaId}
  `;
}
async function persistFileVector(fileId, vector) {
    const v = JSON.stringify(vector);
    await prisma_1.prisma.$executeRaw `
    UPDATE "File" SET embedding = ${v}::vector WHERE id = ${fileId}
  `;
}
function scheduleIdeaEmbedding(ideaId) {
    if (!(0, config_1.hasEmbeddingsConfig)()) {
        logger_1.logger.debug({ ideaId }, 'skip idea embedding: embeddings deployment not configured');
        return;
    }
    void runIdeaEmbeddingJob(ideaId).catch(err => {
        logger_1.logger.warn({ ideaId, err }, 'idea embedding job failed');
    });
}
async function runIdeaEmbeddingJob(ideaId) {
    if (ideaInFlight.has(ideaId)) {
        return;
    }
    ideaInFlight.add(ideaId);
    try {
        const idea = await prisma_1.prisma.idea.findUnique({
            where: { id: ideaId },
            select: { id: true, title: true, summary: true, refinedContent: true },
        });
        if (!idea) {
            return;
        }
        const text = (0, textForIdea_1.buildEmbeddingTextForIdea)(idea);
        if (!text.trim()) {
            return;
        }
        const vector = await (0, generateEmbedding_1.generateEmbedding)(text);
        await persistIdeaVector(ideaId, vector);
    }
    finally {
        ideaInFlight.delete(ideaId);
    }
}
function scheduleFileEmbedding(fileId) {
    if (!(0, config_1.hasEmbeddingsConfig)()) {
        return;
    }
    void runFileEmbeddingJob(fileId).catch(err => {
        logger_1.logger.warn({ fileId, err }, 'file embedding job failed');
    });
}
async function runFileEmbeddingJob(fileId) {
    if (fileInFlight.has(fileId)) {
        return;
    }
    fileInFlight.add(fileId);
    try {
        const file = await prisma_1.prisma.file.findUnique({
            where: { id: fileId },
            select: { id: true, sourceText: true },
        });
        const text = file?.sourceText?.trim() ?? '';
        if (!text) {
            return;
        }
        const vector = await (0, generateEmbedding_1.generateEmbedding)(text);
        await persistFileVector(fileId, vector);
    }
    finally {
        fileInFlight.delete(fileId);
    }
}
