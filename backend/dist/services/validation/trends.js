"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTrends = validateTrends;
const zod_1 = require("zod");
const config_1 = require("../../config");
const azureOpenAI_1 = require("../../lib/azureOpenAI");
const chatCompletionSamplingFallback_1 = require("../ai/chatCompletionSamplingFallback");
const openaiMessageText_1 = require("../ai/openaiMessageText");
const parseAiJson_1 = require("./parseAiJson");
/**
 * Sin API oficial de Trends en el backend: se usa el modelo para estimar
 * momentum de interés a partir de keywords (heurística documentada).
 */
const trendsSchema = zod_1.z.object({
    score: zod_1.z.coerce.number().min(0).max(100),
    summary: zod_1.z.string().optional(),
    related_topics: zod_1.z.array(zod_1.z.string()).optional(),
});
async function validateTrends(idea) {
    const client = (0, azureOpenAI_1.getAzureOpenAIClient)();
    const kw = idea.search_keywords.join(', ');
    const res = await (0, chatCompletionSamplingFallback_1.chatCompletionsCreateWithSamplingFallback)(client, {
        model: config_1.config.azure.deploymentChat,
        messages: [
            {
                role: 'user',
                content: `You estimate relative search / cultural interest momentum (NOT financial advice) for these product keywords over the next 12 months.

Idea: ${idea.elevator_pitch}
Problem: ${idea.problem_statement}
Keywords: ${kw}

Return ONLY JSON:
{
  "score": 0-100 (higher = more people likely searching / discussing this problem space),
  "summary": "2 sentences explaining the estimate",
  "related_topics": ["topic1", "topic2", "topic3"]
}`,
            },
        ],
        temperature: 0.2,
    });
    const text = (0, openaiMessageText_1.completionContentToPlainText)(res.choices[0]?.message?.content) || '{}';
    const parsed = trendsSchema.safeParse((0, parseAiJson_1.parseJsonObject)(text));
    if (!parsed.success) {
        return {
            score: 40,
            summary: 'Trend signal unavailable (invalid model JSON). Neutral default applied.',
            related_topics: [],
            explore_links: [],
        };
    }
    const topics = parsed.data.related_topics ?? [];
    const explore_links = topics.slice(0, 10).map(label => ({
        label,
        url: `https://www.google.com/search?q=${encodeURIComponent(label)}`,
    }));
    return { ...parsed.data, explore_links };
}
