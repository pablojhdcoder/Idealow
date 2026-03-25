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
/** Estimación IA por red (no hay API en vivo ni posts reales). */
const aiPlatformEstimateSchema = zod_1.z.object({
    signal: zod_1.z.coerce.number().min(0).max(100),
    /** Qué temas, tono o tipos de contenido cabría esperar al “buscar” en esa red (sintético). */
    synthetic_findings: zod_1.z.string(),
});
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
/**
 * Solo APIs gratuitas: YouTube Data API (cuota gratuita con clave).
 * X, Instagram y TikTok: solo inferencia del modelo (sin APIs de pago ni scraping).
 */
async function validateSocial(idea) {
    const [ytLong, ytShort] = await Promise.all([
        (0, youtubeSearchVideos_1.youtubeSearchVideos)(idea.search_keywords),
        (0, youtubeSearchVideos_1.youtubeSearchVideos)(idea.search_keywords, { videoDuration: 'short' }),
    ]);
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
                content: `You assess social / video market signal (0-100) for a product idea.

## Real data (YouTube Data API only — free tier with API key)
- General video search: ${ytLong.count} results. Sample titles: ${JSON.stringify(ytLong.titles)}
- Short-form oriented search (Shorts): ${ytShort.count} results. Sample titles: ${JSON.stringify(ytShort.titles)}

## Simulated “social search” for X, Instagram, TikTok (AI only — NO APIs, NO live web)
You cannot access these platforms. For each of X (Twitter), Instagram, and TikTok, produce a **synthetic** estimate of what a search around this idea might surface: typical post themes, creator angles, hashtags or formats, and rough sentiment/noise. This is **not** real posts or counts — training knowledge + reasoning only. Use short Spanish for "synthetic_findings" (2-3 sentences each). Platform-specific hints:
- **X**: threads, news, complaints, niche communities.
- **Instagram**: Reels, aesthetics, influencers, SMB/lifestyle.
- **TikTok**: trends, challenges, duets, Gen-Z tone.

Each platform gets a numeric "signal" field from 0 to 100 (how strong/relevant the discourse around this idea would likely be).

Idea: ${idea.elevator_pitch}
Problem: ${idea.problem_statement}
Keywords: ${idea.search_keywords.join(', ')}

Return ONLY JSON:
{
  "score": 0-100,
  "summary": "3-4 sentences in Spanish: YouTube first if relevant; then one line stating X/IG/TikTok blocks are AI estimates, not live data",
  "youtube_long_count": ${ytLong.count},
  "youtube_shorts_count": ${ytShort.count},
  "ai_social_search": {
    "x": { "signal": 0-100, "synthetic_findings": "Spanish, 2-3 sentences" },
    "instagram": { "signal": 0-100, "synthetic_findings": "Spanish, 2-3 sentences" },
    "tiktok": { "signal": 0-100, "synthetic_findings": "Spanish, 2-3 sentences" }
  },
  "channels_researched": ${JSON.stringify(channelsResearched)}
}`,
            },
        ],
        temperature: 0.2,
    });
    const text = (0, openaiMessageText_1.completionContentToPlainText)(res.choices[0]?.message?.content) || '{}';
    const parsed = socialSchema.safeParse((0, parseAiJson_1.parseJsonObject)(text));
    if (!parsed.success) {
        const base = ytLong.count + ytShort.count > 0 ? 40 : 20;
        return {
            score: base,
            summary: 'No se pudo parsear el JSON del modelo. Solo datos de YouTube si hay clave. Configura YOUTUBE_API_KEY (cuota gratuita).',
            youtube_long_count: ytLong.count,
            youtube_shorts_count: ytShort.count,
            channels_researched: channelsResearched,
        };
    }
    return {
        ...parsed.data,
        youtube_long_count: parsed.data.youtube_long_count ?? ytLong.count,
        youtube_shorts_count: parsed.data.youtube_shorts_count ?? ytShort.count,
        channels_researched: parsed.data.channels_researched ?? channelsResearched,
    };
}
