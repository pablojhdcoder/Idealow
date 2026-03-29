"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSocial = validateSocial;
const zod_1 = require("zod");
const config_1 = require("../../config");
const azureOpenAI_1 = require("../../lib/azureOpenAI");
const chatCompletionSamplingFallback_1 = require("../ai/chatCompletionSamplingFallback");
const openaiMessageText_1 = require("../ai/openaiMessageText");
const parseAiJson_1 = require("./parseAiJson");
const youtubeSearchVideos_1 = require("./youtubeSearchVideos");
const socialEvidenceUrls_1 = require("./socialEvidenceUrls");
/** Estimación IA por red + consultas que convertimos en enlaces de búsqueda reales (sin inventar URLs a posts). */
const evidenceQuerySchema = zod_1.z.object({
    label: zod_1.z.string(),
    query: zod_1.z.string(),
});
const aiPlatformEstimateSchema = zod_1.z.object({
    signal: zod_1.z.coerce.number().min(0).max(100),
    /** Situación y lectura del modelo (español, 2–4 frases). */
    synthetic_findings: zod_1.z.string(),
    /** 2 pares de alta calidad: ángulo + consulta realista para la red. */
    evidence_queries: zod_1.z
        .array(evidenceQuerySchema)
        .optional()
        .transform(arr => arr?.slice(0, 2)),
});
/** Solo X, Instagram y TikTok (YouTube usa únicamente la API de datos). */
const aiSocialSearchSchema = zod_1.z.object({
    x: aiPlatformEstimateSchema.optional(),
    instagram: aiPlatformEstimateSchema.optional(),
    tiktok: aiPlatformEstimateSchema.optional(),
});
const socialSchema = zod_1.z.object({
    score: zod_1.z.coerce.number().min(0).max(100),
    summary: zod_1.z.string().optional(),
    youtube_long_count: zod_1.z.coerce.number().optional(),
    youtube_shorts_count: zod_1.z.coerce.number().optional(),
    /** Búsqueda social simulada por IA: X, Instagram, TikTok. */
    ai_social_search: aiSocialSearchSchema.optional(),
    channels_researched: zod_1.z.array(zod_1.z.string()).optional(),
});
const PLATFORM_LABEL = {
    x: 'X',
    instagram: 'Instagram',
    tiktok: 'TikTok',
};
function normalizeAiSocialForClient(raw, exploreFallback) {
    if (!raw)
        return undefined;
    const fb = exploreFallback.trim();
    const out = {};
    const platforms = ['x', 'instagram', 'tiktok'];
    for (const p of platforms) {
        const block = raw[p];
        if (!block)
            continue;
        const pairs = block.evidence_queries
            ?.filter(x => x.label?.trim().length > 0 && x.query?.trim().length > 0)
            .slice(0, 2) ?? [];
        let evidence_refs = pairs.map(({ label, query }) => ({
            title: label.trim().slice(0, 200),
            url: (0, socialEvidenceUrls_1.buildSocialEvidenceUrl)(p, query.trim()),
        }));
        if (evidence_refs.length === 0 && fb.length > 0) {
            evidence_refs = [
                {
                    title: `Búsqueda sugerida (${PLATFORM_LABEL[p]})`,
                    url: (0, socialEvidenceUrls_1.buildSocialEvidenceUrl)(p, fb),
                },
            ];
        }
        if (evidence_refs.length === 0) {
            evidence_refs = [
                {
                    title: `Explorar ${PLATFORM_LABEL[p]}`,
                    url: (0, socialEvidenceUrls_1.buildSocialEvidenceUrl)(p, ''),
                },
            ];
        }
        out[p] = {
            signal: block.signal,
            synthetic_findings: block.synthetic_findings,
            evidence_refs,
        };
    }
    return Object.keys(out).length > 0 ? out : undefined;
}
function compactExploreFallback(idea) {
    const fromProblem = idea.problem_statement.replace(/\s+/g, ' ').trim().slice(0, 100);
    if (fromProblem.length >= 12)
        return fromProblem;
    return idea.elevator_pitch.replace(/\s+/g, ' ').trim().slice(0, 100);
}
/**
 * Solo APIs gratuitas: YouTube Data API (cuota gratuita con clave).
 * X, Instagram y TikTok: solo inferencia del modelo (sin APIs de pago ni scraping).
 */
async function validateSocial(idea) {
    const ytLong = await (0, youtubeSearchVideos_1.youtubeSearchVideos)(idea, { variant: 'any' });
    const longIds = new Set(ytLong.samples.map(s => s.videoId));
    const ytShort = await (0, youtubeSearchVideos_1.youtubeSearchVideos)(idea, { variant: 'short_form', excludeVideoIds: longIds });
    const channelsResearched = [
        'ai_x_estimate',
        'ai_instagram_estimate',
        'ai_tiktok_estimate',
    ];
    if (config_1.config.youtubeApiKey.trim()) {
        channelsResearched.unshift('youtube', 'youtube_shorts');
    }
    const client = (0, azureOpenAI_1.getAzureOpenAIClient)();
    const res = await (0, chatCompletionSamplingFallback_1.chatCompletionsCreateWithSamplingFallback)(client, {
        model: config_1.config.azure.deploymentChat,
        messages: [
            {
                role: 'user',
                content: `You assess overall social / creator market signal (0-100) for a product idea.

## YouTube (solo API real — ya buscado en el servidor)
- Vídeos encontrados (búsqueda general): ${ytLong.count}. Títulos de muestra: ${JSON.stringify(ytLong.titles)}
- Shorts / cortos: ${ytShort.count}. Títulos de muestra: ${JSON.stringify(ytShort.titles)}
Resume en el "summary" qué tan alineados parecen estos títulos con el problema de la idea. No inventes enlaces ni cuentas de YouTube.

## X, Instagram y TikTok (IA — sin APIs; enlaces serán búsquedas reales generadas después)
Para cada red:
1) "synthetic_findings": español, 2-4 frases — situación del discurso (tono, formatos, quejas, nichos) alrededor de ESTA idea.
2) "evidence_queries": exactamente 2 objetos { "label", "query" } (no más):
   - "label": español, muy corto — qué debería mostrar la búsqueda si es útil para validar la idea.
   - "query": términos MUY CONCRETOS alineados con problema + keywords (sin URLs, sin @inventados). Los dos ángulos deben ser distintos (ej. dolor vs alternativa).
NO inventes enlaces a posts ni IDs.

Idea: ${idea.elevator_pitch}
Problem: ${idea.problem_statement}
Keywords: ${idea.search_keywords.join(', ')}

Return ONLY JSON:
{
  "score": 0-100,
  "summary": "3-4 sentences in Spanish: YouTube API first; then that X/IG/TikTok use AI synthesis plus search links you will open to verify",
  "youtube_long_count": ${ytLong.count},
  "youtube_shorts_count": ${ytShort.count},
  "ai_social_search": {
    "x": {
      "signal": 0-100,
      "synthetic_findings": "Spanish, 2-4 sentences",
      "evidence_queries": [
        { "label": "…", "query": "…" },
        { "label": "…", "query": "…" }
      ]
    },
    "instagram": { "signal": 0-100, "synthetic_findings": "...", "evidence_queries": [ { "label": "…", "query": "…" }, { "label": "…", "query": "…" } ] },
    "tiktok": { "signal": 0-100, "synthetic_findings": "...", "evidence_queries": [ { "label": "…", "query": "…" }, { "label": "…", "query": "…" } ] }
  },
  "channels_researched": ${JSON.stringify(channelsResearched)}
}`,
            },
        ],
        temperature: 0.2,
    });
    const text = (0, openaiMessageText_1.completionContentToPlainText)(res.choices[0]?.message?.content) || '{}';
    const parsed = socialSchema.safeParse((0, parseAiJson_1.parseJsonObject)(text));
    const explore_query = idea.search_keywords
        .map(k => k.trim())
        .filter(Boolean)
        .slice(0, 5)
        .join(' ')
        .trim() ||
        compactExploreFallback(idea);
    if (!parsed.success) {
        const base = ytLong.count + ytShort.count > 0 ? 40 : 20;
        return {
            score: base,
            summary: 'No se pudo parsear el JSON del modelo. Solo datos de YouTube si hay clave. Configura YOUTUBE_API_KEY (cuota gratuita).',
            youtube_long_count: ytLong.count,
            youtube_shorts_count: ytShort.count,
            channels_researched: channelsResearched,
            youtube_long_samples: ytLong.samples,
            youtube_shorts_samples: ytShort.samples,
            explore_query,
        };
    }
    const ai_social_search = normalizeAiSocialForClient(parsed.data.ai_social_search, explore_query);
    return {
        ...parsed.data,
        ai_social_search,
        youtube_long_count: parsed.data.youtube_long_count ?? ytLong.count,
        youtube_shorts_count: parsed.data.youtube_shorts_count ?? ytShort.count,
        channels_researched: parsed.data.channels_researched ?? channelsResearched,
        youtube_long_samples: ytLong.samples,
        youtube_shorts_samples: ytShort.samples,
        explore_query,
    };
}
