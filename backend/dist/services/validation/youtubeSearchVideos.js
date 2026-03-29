"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.youtubeSearchVideos = youtubeSearchVideos;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../../config");
const logger_1 = require("../../lib/logger");
function compact(s, max) {
    return s.replace(/\s+/g, ' ').trim().slice(0, max);
}
/** Varias cadenas de búsqueda a partir del pitch, problema y keywords (evita depender solo de keywords vacíos). */
function buildSearchQueries(idea) {
    const kws = idea.search_keywords.map(k => k.trim()).filter(k => k.length > 1);
    const kwLine = compact(kws.join(' '), 90);
    const problem = compact(idea.problem_statement, 110);
    const pitch = compact(idea.elevator_pitch, 90);
    const out = [];
    const seen = new Set();
    const add = (q) => {
        const t = compact(q, 120);
        if (t.length < 4)
            return;
        const key = t.toLowerCase();
        if (seen.has(key))
            return;
        seen.add(key);
        out.push(t);
    };
    if (kwLine.length >= 4)
        add(kwLine);
    if (problem.length >= 14)
        add(problem);
    if (pitch.length >= 14)
        add(pitch);
    if (kwLine.length >= 4 && problem.length >= 14) {
        add(compact(`${kwLine.split(/\s+/).slice(0, 4).join(' ')} ${problem.slice(0, 72)}`, 120));
    }
    if (kwLine.length >= 4 && pitch.length >= 14) {
        add(compact(`${kwLine.split(/\s+/).slice(0, 3).join(' ')} ${pitch.slice(0, 68)}`, 120));
    }
    if (out.length === 0) {
        add(problem || pitch || 'startup product');
    }
    return out.slice(0, 5);
}
function youtubeLocaleParams(idea) {
    const blob = `${idea.problem_statement}${idea.elevator_pitch}`;
    if (/[áéíóúñü¿¡]/i.test(blob)) {
        return { relevanceLanguage: 'es', regionCode: 'ES' };
    }
    return { relevanceLanguage: 'en', regionCode: 'US' };
}
/** Solapamiento título ↔ idea (misma idea que Reddit: menos ruido en resultados genéricos). */
function titleRelevanceToIdea(idea, title) {
    const blob = `${idea.elevator_pitch} ${idea.problem_statement} ${idea.search_keywords.join(' ')}`;
    const norm = (s) => s
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '');
    const ideaTok = new Set(norm(blob)
        .split(/[\s,.;:/\\()[\]{}'"¿?¡!]+/)
        .filter(w => w.length > 2));
    const titleTok = new Set(norm(title)
        .split(/[\s,.;:/\\()[\]{}'"¿?¡!]+/)
        .filter(w => w.length > 2));
    if (ideaTok.size === 0)
        return 0.35;
    let overlap = 0;
    for (const w of titleTok) {
        if (ideaTok.has(w))
            overlap++;
    }
    const denom = Math.sqrt(ideaTok.size * Math.max(titleTok.size, 1));
    return denom > 0 ? overlap / denom : 0;
}
async function searchYoutubeOnce(q, extraParams) {
    const key = config_1.config.youtubeApiKey.trim();
    if (!key || !q.trim())
        return [];
    try {
        const { data } = await axios_1.default.get('https://www.googleapis.com/youtube/v3/search', {
            params: {
                part: 'snippet',
                type: 'video',
                maxResults: 12,
                q: q.trim(),
                key,
                order: 'relevance',
                safeSearch: 'moderate',
                ...extraParams,
            },
            timeout: 14000,
        });
        const items = data.items ?? [];
        const samples = [];
        for (const i of items) {
            const videoId = i.id?.videoId;
            const title = i.snippet?.title;
            if (typeof videoId !== 'string' || typeof title !== 'string')
                continue;
            const channelTitle = typeof i.snippet?.channelTitle === 'string' ? i.snippet.channelTitle : undefined;
            samples.push({ videoId, title, channelTitle });
        }
        return samples;
    }
    catch (e) {
        const ax = e;
        const apiMsg = ax.response?.data?.error?.message;
        logger_1.logger.warn({ err: apiMsg ?? ax.message, q: q.slice(0, 80), status: ax.response?.status }, 'YouTube search request failed');
        return [];
    }
}
/**
 * YouTube Data API v3 (`search.list`).
 * Combina varias consultas y deduplica por `videoId`. Shorts: primero `videoDuration=short`, luego fallback con “#shorts”.
 */
async function youtubeSearchVideos(idea, opts) {
    const key = config_1.config.youtubeApiKey.trim();
    if (!key) {
        return { count: 0, titles: [], samples: [] };
    }
    const variant = opts?.variant ?? 'any';
    const exclude = opts?.excludeVideoIds ?? new Set();
    const queries = buildSearchQueries(idea);
    const base = youtubeLocaleParams(idea);
    const merged = [];
    const seen = new Set();
    const pushBatch = (batch) => {
        for (const s of batch) {
            if (exclude.has(s.videoId) || seen.has(s.videoId))
                continue;
            seen.add(s.videoId);
            merged.push(s);
        }
    };
    const targetMax = 14;
    if (variant === 'short_form') {
        for (const q of queries) {
            if (merged.length >= targetMax)
                break;
            const batch = await searchYoutubeOnce(q, { ...base, videoDuration: 'short' });
            pushBatch(batch);
        }
        if (merged.length < 3) {
            for (const q of queries) {
                if (merged.length >= targetMax)
                    break;
                const batch = await searchYoutubeOnce(compact(`${q} #shorts`, 120), base);
                pushBatch(batch);
            }
        }
    }
    else {
        for (const q of queries) {
            if (merged.length >= targetMax)
                break;
            const batch = await searchYoutubeOnce(q, base);
            pushBatch(batch);
        }
    }
    merged.sort((a, b) => {
        const ra = titleRelevanceToIdea(idea, a.title) * 100 + Math.log1p((a.title?.length ?? 0) / 40);
        const rb = titleRelevanceToIdea(idea, b.title) * 100 + Math.log1p((b.title?.length ?? 0) / 40);
        return rb - ra;
    });
    const samples = merged.slice(0, 5);
    return {
        count: samples.length,
        titles: samples.map(s => s.title).slice(0, 5),
        samples,
    };
}
