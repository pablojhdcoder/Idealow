"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEmbedding = generateEmbedding;
const config_1 = require("../../config");
const azureOpenAI_1 = require("../../lib/azureOpenAI");
const MAX_INPUT_CHARS = 30000;
/**
 * Genera un vector de embedding con el deployment de Azure configurado.
 */
async function generateEmbedding(text) {
    const trimmed = text.trim().slice(0, MAX_INPUT_CHARS);
    if (!trimmed) {
        throw new Error('Empty text for embedding');
    }
    const client = (0, azureOpenAI_1.getAzureOpenAIClient)();
    const res = await client.embeddings.create({
        model: config_1.config.azure.deploymentEmbeddings,
        input: trimmed,
    });
    const vec = res.data[0]?.embedding;
    if (!vec || !Array.isArray(vec)) {
        throw new Error('Embedding API returned no vector');
    }
    const expected = config_1.config.embeddingDimensions;
    if (vec.length !== expected) {
        throw new Error(`Embedding dimension mismatch: got ${vec.length}, expected ${expected}`);
    }
    return vec;
}
