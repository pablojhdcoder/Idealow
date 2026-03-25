"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractIdea = extractIdea;
const zod_1 = require("zod");
const config_1 = require("../../config");
const azureOpenAI_1 = require("../../lib/azureOpenAI");
const chatCompletionSamplingFallback_1 = require("./chatCompletionSamplingFallback");
const openaiMessageText_1 = require("./openaiMessageText");
const SYSTEM_PROMPT = `You are an idea extraction specialist. Take raw unstructured input
(notes, transcripts, articles, voice memos) and extract the core idea.

Return ONLY a JSON object with this exact structure, no markdown, no explanation:
{
  "title": "5-8 word title that captures the essence",
  "problem": "The specific problem this solves (1-2 sentences)",
  "solution": "The proposed solution (1-2 sentences)",
  "target_audience": "Who would use this (specific, not generic)",
  "sector": "One of: tech, health, finance, education, travel, food, sports, entertainment, productivity, other",
  "elevator_pitch": "One sentence. What it is, for whom, why it matters.",
  "confidence": 0.0,
  "search_keywords": ["keyword1", "keyword2"]
}

Rules:
- NEVER invent details not present in the input
- Be specific, not generic
- If input is too vague, set confidence below 0.4
- search_keywords: 5-8 terms useful for market research`;
const extractedIdeaSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    problem: zod_1.z.string().min(1),
    solution: zod_1.z.string().min(1),
    target_audience: zod_1.z.string().min(1),
    sector: zod_1.z.string().min(1),
    elevator_pitch: zod_1.z.string().min(1),
    confidence: zod_1.z.number(),
    search_keywords: zod_1.z.array(zod_1.z.string()),
});
const stripMarkdownCodeFence = (value) => {
    const trimmed = value.trim();
    if (!trimmed.startsWith('```')) {
        return trimmed;
    }
    return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
};
async function extractIdea(rawText, hintSector) {
    const client = (0, azureOpenAI_1.getAzureOpenAIClient)();
    const response = await (0, chatCompletionSamplingFallback_1.chatCompletionsCreateWithSamplingFallback)(client, {
        model: config_1.config.azure.deploymentExtraction,
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
                role: 'user',
                content: `Extract the idea from this input:\n\n${rawText}${hintSector ? `\n\nHint: user is interested in the ${hintSector} sector` : ''}`,
            },
        ],
        temperature: 0.2,
    });
    const text = (0, openaiMessageText_1.completionContentToPlainText)(response.choices[0]?.message?.content) || '{}';
    const cleaned = stripMarkdownCodeFence(text);
    let parsed;
    try {
        parsed = JSON.parse(cleaned);
    }
    catch {
        throw new Error('Extractor returned non-JSON response');
    }
    return extractedIdeaSchema.parse(parsed);
}
