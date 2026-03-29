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
const STOPWORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'for', 'with', 'this', 'that', 'from', 'are', 'was', 'were',
    'been', 'have', 'has', 'had', 'not', 'but', 'what', 'all', 'can', 'any', 'get', 'got', 'how',
    'why', 'when', 'where', 'who', 'your', 'you', 'into', 'just', 'very', 'more', 'some', 'than',
    'then', 'them', 'they', 'their', 'also', 'only', 'like', 'would', 'could', 'should', 'about',
    'una', 'uno', 'unos', 'unas', 'los', 'las', 'del', 'las', 'por', 'con', 'para', 'que', 'como',
    'más', 'sobre', 'todo', 'todos', 'toda', 'todas', 'ser', 'son', 'es', 'está', 'están', 'hay',
    'sin', 'pero', 'sus', 'nuestro', 'mi', 'tu', 'ya', 'muy', 'tan', 'asi', 'aqui', 'algo', 'cada',
].map(w => w.normalize('NFD').replace(/\p{M}/gu, '')));
function normalizeToken(raw) {
    return raw
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/[^a-z0-9áéíóúñü]/gi, '');
}
function buildIdeaTokenSet(idea) {
    const out = new Set();
    const addText = (s) => {
        for (const part of s.split(/[\s,.;:/\\()[\]{}'"¿?¡!]+/)) {
            const t = normalizeToken(part);
            if (t.length > 2 && !STOPWORDS.has(t))
                out.add(t);
        }
    };
    addText(idea.elevator_pitch);
    addText(idea.problem_statement);
    for (const kw of idea.search_keywords) {
        addText(kw);
    }
    return out;
}
/**
 * Solapamiento normalizado entre términos de la idea y el hilo (título + selftext).
 * Reduce ruido de búsquedas demasiado genéricas en Reddit.
 */
function postRelevanceScore(ideaTokens, title, text) {
    if (ideaTokens.size === 0)
        return 0.5;
    const postTokens = new Set();
    const addText = (s) => {
        for (const part of s.split(/[\s,.;:/\\()[\]{}'"¿?¡!]+/)) {
            const t = normalizeToken(part);
            if (t.length > 2 && !STOPWORDS.has(t))
                postTokens.add(t);
        }
    };
    addText(title);
    addText(text);
    let overlap = 0;
    for (const t of ideaTokens) {
        if (postTokens.has(t))
            overlap++;
    }
    const denom = Math.sqrt(ideaTokens.size * Math.max(postTokens.size, 1));
    return denom > 0 ? overlap / denom : 0;
}
function rankRedditPosts(idea, posts) {
    const ideaTokens = buildIdeaTokenSet(idea);
    const enriched = posts.map(p => ({
        ...p,
        _rel: postRelevanceScore(ideaTokens, p.title, p.text),
    }));
    enriched.sort((a, b) => {
        const ra = a._rel * 110 + Math.log1p(Math.max(a.score, 0)) * 9;
        const rb = b._rel * 110 + Math.log1p(Math.max(b.score, 0)) * 9;
        return rb - ra;
    });
    const withSignal = enriched.filter(p => p._rel >= 0.04 || p.score >= 45);
    const pool = withSignal.length >= 8 ? withSignal : enriched;
    return pool
        .filter(p => p.score > 8)
        .slice(0, 40)
        .map(({ _rel, ...rest }) => rest);
}
const evidencePostSchema = zod_1.z.object({
    title: zod_1.z.string(),
    url: zod_1.z.string(),
    subreddit: zod_1.z.string().optional(),
});
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
    /** Recortamos en parseo por si el modelo devuelve demasiadas entradas. */
    subreddits: zod_1.z
        .array(zod_1.z.string())
        .optional()
        .transform(arr => arr?.map(s => s.replace(/^r\//i, '').trim()).filter(Boolean).slice(0, 4)),
    summary: zod_1.z.string().optional(),
    evidence_posts: zod_1.z
        .array(evidencePostSchema)
        .optional()
        .transform(arr => arr?.slice(0, 5)),
});
async function validateReddit(idea) {
    const client = (0, azureOpenAI_1.getAzureOpenAIClient)();
    const kwLine = idea.search_keywords.length > 0
        ? idea.search_keywords.slice(0, 14).join(', ')
        : '(derive 5 concrete keywords from the problem and idea below)';
    const queriesRes = await (0, chatCompletionSamplingFallback_1.chatCompletionsCreateWithSamplingFallback)(client, {
        model: config_1.config.azure.deploymentChat,
        messages: [
            {
                role: 'user',
                content: `You write search queries for Reddit's public search (reddit.com/search). Each query must help find REAL threads where people vent, struggle, ask for help, or compare tools about THIS SPECIFIC problem space — not generic entrepreneurship or "startup ideas".

STRICT RULES:
- Every query MUST be clearly tied to the problem or keywords below (use their vocabulary: product type, audience, workflow, pain).
- Prefer 6–12 words: concrete nouns + pain (e.g. "frustrated with", "alternatives to", "how do you", "hate when", "is there a better").
- Do NOT output vague or off-topic queries (e.g. "motivation for founders", "how to validate a business", "side project ideas") unless they directly match the stated problem.
- Do NOT repeat the same query with tiny edits; 5 DISTINCT queries.
- Language: match the idea (Spanish or English) as appropriate.

Idea (elevator): ${idea.elevator_pitch}
Problem statement: ${idea.problem_statement}
Keywords (must appear in or clearly inform each query): ${kwLine}

Return ONLY a JSON array of 5 strings: ["query1", "query2", "query3", "query4", "query5"]`,
            },
        ],
        temperature: 0.15,
    });
    const queriesText = (0, openaiMessageText_1.completionContentToPlainText)(queriesRes.choices[0]?.message?.content) || '[]';
    const queriesRaw = (0, parseAiJson_1.parseJsonArray)(queriesText);
    let queries = queriesRaw
        .filter((q) => typeof q === 'string' && q.trim().length > 4)
        .map(q => q.trim().slice(0, 220))
        .slice(0, 6);
    if (queries.length === 0) {
        const parts = [
            idea.problem_statement.slice(0, 140),
            idea.elevator_pitch.slice(0, 120),
            ...idea.search_keywords.slice(0, 4),
        ].filter(s => s.trim().length > 5);
        queries = [...new Set(parts)].slice(0, 4);
    }
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
    const ranked = rankRedditPosts(idea, posts);
    const analysisPool = ranked.slice(0, 14);
    const rankedSubLower = new Set(ranked.map(p => p.subreddit.trim().toLowerCase()).filter(Boolean));
    const analysisRes = await (0, chatCompletionSamplingFallback_1.chatCompletionsCreateWithSamplingFallback)(client, {
        model: config_1.config.azure.deploymentChat,
        messages: [
            {
                role: 'user',
                content: `Analyze ONLY these Reddit posts for THIS idea. Treat clearly off-topic threads as noise and lower the score.

Idea: ${idea.elevator_pitch}
Problem: ${idea.problem_statement}
Keywords: ${idea.search_keywords.join(', ')}

Posts (title, text snippet, subreddit, score): ${JSON.stringify(analysisPool)}

Rules:
- "top_complaints": at most 3 short bullets, each tied to the problem space.
- "failed_solutions": at most 2 items (tools/approaches people dislike).
- "subreddits": at most 4 entries, subreddit name only (no "r/" prefix). Each MUST be one of the subreddits present in the posts list above.
- "best_quote": must use text from a post in the list and its URL if available.

Return ONLY this JSON:
{
  "score": 0-100,
  "post_count": ${analysisPool.length},
  "top_complaints": ["…", "…"],
  "failed_solutions": ["…"],
  "best_quote": { "text": "…", "upvotes": 0, "url": "…" },
  "subreddits": ["subreddit1", "subreddit2"],
  "summary": "2 sentences"
}`,
            },
        ],
        temperature: 0.2,
    });
    const text = (0, openaiMessageText_1.completionContentToPlainText)(analysisRes.choices[0]?.message?.content) || '{}';
    const obj = (0, parseAiJson_1.parseJsonObject)(text);
    const evidenceFromRank = ranked.slice(0, 5).map(p => ({
        title: p.title.slice(0, 200),
        url: p.url,
        ...(p.subreddit ? { subreddit: p.subreddit } : {}),
    }));
    const parsed = redditAnalysisSchema.safeParse(obj);
    if (!parsed.success) {
        logger_1.logger.warn({ err: parsed.error.flatten(), ideaPitch: idea.elevator_pitch }, 'reddit analysis parse failed');
        const subFallback = [
            ...new Set(ranked
                .slice(0, 12)
                .map(p => p.subreddit.trim())
                .filter(Boolean)),
        ].slice(0, 4);
        const subreddits = subFallback.length > 0 ? subFallback : undefined;
        return {
            score: analysisPool.length >= 5 ? 45 : 20,
            post_count: analysisPool.length,
            summary: 'Could not parse AI analysis; score estimated from post volume.',
            evidence_posts: evidenceFromRank,
            subreddits,
        };
    }
    const aiSubs = (parsed.data.subreddits ?? [])
        .map(s => s.replace(/^r\//i, '').trim())
        .filter(s => rankedSubLower.has(s.toLowerCase()))
        .slice(0, 4);
    const fallbackSubs = [
        ...new Set(ranked
            .slice(0, 12)
            .map(p => p.subreddit.trim())
            .filter(Boolean)),
    ].slice(0, 4);
    const subreddits = aiSubs.length >= 2 ? aiSubs : fallbackSubs;
    return {
        ...parsed.data,
        subreddits,
        evidence_posts: evidenceFromRank,
    };
}
