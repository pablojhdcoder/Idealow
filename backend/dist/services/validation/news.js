"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateNews = validateNews;
const zod_1 = require("zod");
const config_1 = require("../../config");
const azureOpenAI_1 = require("../../lib/azureOpenAI");
const chatCompletionSamplingFallback_1 = require("../ai/chatCompletionSamplingFallback");
const openaiMessageText_1 = require("../ai/openaiMessageText");
const fetchGoogleNewsRss_1 = require("./fetchGoogleNewsRss");
const parseAiJson_1 = require("./parseAiJson");
const newsSchema = zod_1.z.object({
    score: zod_1.z.coerce.number().min(0).max(100),
    summary: zod_1.z.string().optional(),
    headline_count: zod_1.z.coerce.number().optional(),
    /** 3-5 titulares más relevantes según el modelo */
    top_headlines: zod_1.z.array(zod_1.z.string()).optional(),
});
function buildNewsQuery(idea) {
    const kw = idea.search_keywords.slice(0, 5).join(' ');
    const problem = idea.problem_statement.replace(/\s+/g, ' ').trim().slice(0, 160);
    return `${kw} ${problem}`.trim().slice(0, 280);
}
/**
 * Actualidad: RSS de Google News (sin API key) + síntesis con IA.
 */
async function validateNews(idea) {
    const query = buildNewsQuery(idea);
    const headlines = await (0, fetchGoogleNewsRss_1.fetchGoogleNewsTitles)(query, 20);
    const client = (0, azureOpenAI_1.getAzureOpenAIClient)();
    const res = await (0, chatCompletionSamplingFallback_1.chatCompletionsCreateWithSamplingFallback)(client, {
        model: config_1.config.azure.deploymentChat,
        messages: [
            {
                role: 'user',
                content: `You analyze RECENT NEWS relevance for this idea (0-100). Headlines come from Google News RSS (public); there may be noise.

Headlines (${headlines.length}):
${JSON.stringify(headlines.slice(0, 18))}

Idea: ${idea.elevator_pitch}
Problem: ${idea.problem_statement}

Return ONLY JSON:
{
  "score": 0-100,
  "summary": "2 sentences: is the problem/topic in the news cycle? timeliness?",
  "headline_count": ${headlines.length},
  "top_headlines": ["pick up to 5 most relevant real headlines from the list above only"]
}`,
            },
        ],
        temperature: 0.2,
    });
    const text = (0, openaiMessageText_1.completionContentToPlainText)(res.choices[0]?.message?.content) || '{}';
    const parsed = newsSchema.safeParse((0, parseAiJson_1.parseJsonObject)(text));
    if (!parsed.success) {
        const score = headlines.length >= 8 ? 48 : headlines.length >= 3 ? 35 : 18;
        return {
            score,
            summary: 'News angle estimated from headline count only (model JSON parse failed).',
            headline_count: headlines.length,
            top_headlines: headlines.slice(0, 5),
        };
    }
    return {
        ...parsed.data,
        headline_count: parsed.data.headline_count ?? headlines.length,
    };
}
