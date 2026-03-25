"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateReddit = validateReddit;
const axios_1 = __importDefault(require("axios"));
const zod_1 = require("zod");
const config_1 = require("../../config");
const azureOpenAI_1 = require("../../lib/azureOpenAI");
const chatCompletionSamplingFallback_1 = require("../ai/chatCompletionSamplingFallback");
const openaiMessageText_1 = require("../ai/openaiMessageText");
const logger_1 = require("../../lib/logger");
const parseAiJson_1 = require("./parseAiJson");
/** Reddit JSON público + IA. API OAuth: https://www.reddit.com/dev/api/ */
const redditAnalysisSchema = zod_1.z.object({
    score: zod_1.z.coerce.number().min(0).max(100),
    post_count: zod_1.z.coerce.number().optional(),
    top_complaints: zod_1.z.array(zod_1.z.string()).optional(),
    failed_solutions: zod_1.z.array(zod_1.z.string()).optional(),
    best_quote: zod_1.z
        .object({
        text: zod_1.z.string(),
        upvotes: zod_1.z.coerce.number().optional(),
        url: zod_1.z.string().optional(),
    })
        .optional(),
    subreddits: zod_1.z.array(zod_1.z.string()).optional(),
    summary: zod_1.z.string().optional(),
});
async function validateReddit(idea) {
    const client = (0, azureOpenAI_1.getAzureOpenAIClient)();
    const queriesRes = await (0, chatCompletionSamplingFallback_1.chatCompletionsCreateWithSamplingFallback)(client, {
        model: config_1.config.azure.deploymentChat,
        messages: [
            {
                role: 'user',
                content: `Generate 6 Reddit search queries to find people COMPLAINING about this problem.
Idea: ${idea.elevator_pitch}
Problem: ${idea.problem_statement}
Return ONLY a JSON array of strings: ["query1", "query2", ...]`,
            },
        ],
        temperature: 0.2,
    });
    const queriesText = (0, openaiMessageText_1.completionContentToPlainText)(queriesRes.choices[0]?.message?.content) || '[]';
    const queriesRaw = (0, parseAiJson_1.parseJsonArray)(queriesText);
    const queries = queriesRaw.filter((q) => typeof q === 'string').slice(0, 8);
    const searchResults = await Promise.allSettled(queries.map(q => axios_1.default.get('https://www.reddit.com/search.json', {
        params: { q, sort: 'top', limit: 25, t: 'year' },
        headers: { 'User-Agent': 'Idealow/1.0 (validation)' },
        timeout: 8000,
    })));
    const posts = [];
    for (const r of searchResults) {
        if (r.status !== 'fulfilled')
            continue;
        const children = r.value.data?.data?.children;
        if (!Array.isArray(children))
            continue;
        for (const p of children) {
            const d = p.data;
            if (!d || typeof d !== 'object')
                continue;
            const title = typeof d.title === 'string' ? d.title : '';
            const selftext = typeof d.selftext === 'string' ? d.selftext : '';
            const score = typeof d.score === 'number' ? d.score : 0;
            const sub = typeof d.subreddit === 'string' ? d.subreddit : '';
            const permalink = typeof d.permalink === 'string' ? d.permalink : '';
            posts.push({
                title,
                text: selftext.slice(0, 300),
                score,
                subreddit: sub,
                url: permalink ? `https://reddit.com${permalink}` : '',
            });
        }
    }
    const filtered = posts.filter(p => p.score > 10).slice(0, 40);
    const analysisRes = await (0, chatCompletionSamplingFallback_1.chatCompletionsCreateWithSamplingFallback)(client, {
        model: config_1.config.azure.deploymentChat,
        messages: [
            {
                role: 'user',
                content: `Analyze these Reddit posts to measure pain signal for:
"${idea.elevator_pitch}"

Posts: ${JSON.stringify(filtered)}

Return ONLY this JSON:
{
  "score": 0-100,
  "post_count": ${filtered.length},
  "top_complaints": ["complaint1", "complaint2", "complaint3"],
  "failed_solutions": ["solution people tried but dislike"],
  "best_quote": { "text": "most powerful quote", "upvotes": 0, "url": "..." },
  "subreddits": ["r/example"],
  "summary": "2 sentence summary"
}`,
            },
        ],
        temperature: 0.2,
    });
    const text = (0, openaiMessageText_1.completionContentToPlainText)(analysisRes.choices[0]?.message?.content) || '{}';
    const obj = (0, parseAiJson_1.parseJsonObject)(text);
    const parsed = redditAnalysisSchema.safeParse(obj);
    if (!parsed.success) {
        logger_1.logger.warn({ err: parsed.error.flatten(), ideaPitch: idea.elevator_pitch }, 'reddit analysis parse failed');
        return {
            score: filtered.length >= 5 ? 45 : 20,
            post_count: filtered.length,
            summary: 'Could not parse AI analysis; score estimated from post volume.',
        };
    }
    return parsed.data;
}
