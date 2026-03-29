"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.linkHeadlinesToRss = linkHeadlinesToRss;
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
    /** Hasta 4 titulares del listado RSS (copia exacta o casi exacta). */
    top_headlines: zod_1.z.array(zod_1.z.string()).optional(),
});
/** Empareja titulares del modelo con ítems RSS (exacto, prefijo o solapamiento de tokens). */
function linkHeadlinesToRss(headlines, items) {
    if (!headlines?.length)
        return [];
    return headlines.map(title => {
        const hit = findBestRssMatch(title, items);
        return { title, url: hit?.url };
    });
}
function findBestRssMatch(title, items) {
    const t = title.trim().toLowerCase();
    if (!t)
        return undefined;
    for (const it of items) {
        const u = it.title.trim().toLowerCase();
        if (u === t)
            return it;
        const n = Math.min(36, t.length, u.length);
        if (n >= 8 && (u.includes(t.slice(0, n)) || t.includes(u.slice(0, n))))
            return it;
    }
    const titleTokens = new Set(t.split(/\s+/).filter(w => w.length > 3));
    if (titleTokens.size === 0)
        return undefined;
    let best;
    let bestScore = 0;
    for (const it of items) {
        const u = it.title.trim().toLowerCase();
        const uTokens = new Set(u.split(/\s+/).filter(w => w.length > 3));
        let overlap = 0;
        for (const tok of titleTokens) {
            if (uTokens.has(tok))
                overlap++;
        }
        if (overlap > bestScore) {
            bestScore = overlap;
            best = it;
        }
    }
    if (bestScore >= 2)
        return best;
    return undefined;
}
function buildNewsQuery(idea) {
    const kw = idea.search_keywords
        .map(k => k.trim())
        .filter(Boolean)
        .slice(0, 5)
        .join(' ');
    const problem = idea.problem_statement.replace(/\s+/g, ' ').trim().slice(0, 160);
    const pitch = idea.elevator_pitch.replace(/\s+/g, ' ').trim().slice(0, 120);
    const parts = [kw, problem, pitch].filter(s => s.length > 0);
    const joined = parts.join(' ').trim();
    return (joined || 'innovación tecnología').slice(0, 280);
}
function googleNewsRssLocale(idea) {
    const blob = `${idea.problem_statement} ${idea.elevator_pitch}`;
    if (/[áéíóúñü¿¡]/i.test(blob)) {
        return { hl: 'es', gl: 'ES', ceid: 'ES:es' };
    }
    return { hl: 'en', gl: 'US', ceid: 'US:en' };
}
const LOCALE_EN_US = { hl: 'en', gl: 'US', ceid: 'US:en' };
/**
 * Varias consultas: la larga (pitch+problema+keywords) a menudo devuelve 0 ítems en el RSS;
 * las cortas y un espejo en inglés suelen recuperar titulares útiles.
 */
function buildNewsRssAttempts(idea) {
    const primary = googleNewsRssLocale(idea);
    const kws = idea.search_keywords.map(k => k.trim()).filter(Boolean);
    const attempts = [];
    const seen = new Set();
    const push = (q, locale = primary) => {
        const t = q.replace(/\s+/g, ' ').trim().slice(0, 280);
        if (t.length < 2)
            return;
        const key = `${locale.ceid}::${t.toLowerCase()}`;
        if (seen.has(key))
            return;
        seen.add(key);
        attempts.push({ query: t, locale });
    };
    push(buildNewsQuery(idea), primary);
    const kw2 = kws.slice(0, 2).join(' ');
    const kw3 = kws.slice(0, 3).join(' ');
    const pitch6 = idea.elevator_pitch
        .replace(/\s+/g, ' ')
        .trim()
        .split(/\s+/)
        .slice(0, 6)
        .join(' ');
    const problem8 = idea.problem_statement
        .replace(/\s+/g, ' ')
        .trim()
        .split(/\s+/)
        .slice(0, 8)
        .join(' ');
    push(kw2, primary);
    push(kw3, primary);
    push(pitch6, primary);
    push(problem8, primary);
    if (kws[0])
        push(kws[0], primary);
    if (primary.hl === 'es') {
        push(kw2, LOCALE_EN_US);
        push(kw3, LOCALE_EN_US);
        push(pitch6, LOCALE_EN_US);
        if (kws[0])
            push(kws[0], LOCALE_EN_US);
        push(problem8, LOCALE_EN_US);
    }
    return attempts;
}
/**
 * Actualidad: RSS de Google News (sin API key) + síntesis con IA.
 * El RSS se obtiene en el servidor; las URLs son las que devuelve Google News por ítem.
 */
async function validateNews(idea) {
    const attempts = buildNewsRssAttempts(idea);
    const rssItems = await (0, fetchGoogleNewsRss_1.fetchGoogleNewsItemsWithFallbacks)(attempts, 26);
    const headlines = rssItems.map(i => i.title);
    /** Subconjunto para la UI si hace falta fallback sin URL de la IA */
    const news_references = rssItems.slice(0, 8);
    const client = (0, azureOpenAI_1.getAzureOpenAIClient)();
    const res = await (0, chatCompletionSamplingFallback_1.chatCompletionsCreateWithSamplingFallback)(client, {
        model: config_1.config.azure.deploymentChat,
        messages: [
            {
                role: 'user',
                content: `You analyze RECENT NEWS relevance for this idea (0-100). Headlines below are verbatim from Google News RSS (public); there may be irrelevant items.

Headlines (${headlines.length}):
${JSON.stringify(headlines.slice(0, 18))}

Idea: ${idea.elevator_pitch}
Problem: ${idea.problem_statement}

Rules:
- "top_headlines": pick at most 4 headlines that are MOST relevant to this specific problem/idea. Each string must be copied exactly from the list above (or differ only by trivial whitespace).
- If none are relevant, return an empty array and a low score with summary explaining mismatch.

Return ONLY JSON:
{
  "score": 0-100,
  "summary": "2 sentences in Spanish: news cycle fit, timeliness, caveats",
  "headline_count": ${headlines.length},
  "top_headlines": ["up to 4 exact headlines from the list"]
}`,
            },
        ],
        temperature: 0.2,
    });
    const text = (0, openaiMessageText_1.completionContentToPlainText)(res.choices[0]?.message?.content) || '{}';
    const parsed = newsSchema.safeParse((0, parseAiJson_1.parseJsonObject)(text));
    if (!parsed.success) {
        const score = headlines.length >= 8 ? 48 : headlines.length >= 3 ? 35 : 18;
        const top = headlines.slice(0, 4);
        return {
            score,
            summary: 'Ángulo de actualidad estimado por volumen de titulares (fallo al interpretar JSON del modelo).',
            headline_count: headlines.length,
            top_headlines: top,
            news_references,
            headline_links: linkHeadlinesToRss(top, rssItems),
        };
    }
    const topHeadlines = (parsed.data.top_headlines ?? []).slice(0, 4);
    return {
        ...parsed.data,
        top_headlines: topHeadlines,
        headline_count: parsed.data.headline_count ?? headlines.length,
        news_references,
        headline_links: linkHeadlinesToRss(topHeadlines, rssItems),
    };
}
