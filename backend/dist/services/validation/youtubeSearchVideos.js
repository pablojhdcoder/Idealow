"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.youtubeSearchVideos = youtubeSearchVideos;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../../config");
const logger_1 = require("../../lib/logger");
/** YouTube Data API v3 (`search.list`) — https://developers.google.com/youtube/v3 */
async function youtubeSearchVideos(keywords, opts) {
    const key = config_1.config.youtubeApiKey.trim();
    if (!key) {
        return { count: 0, titles: [] };
    }
    const q = opts?.videoDuration === 'short'
        ? `${keywords.slice(0, 4).join(' ')} shorts`.trim() || 'shorts'
        : keywords.slice(0, 5).join(' ').trim() || 'startup';
    try {
        const { data } = await axios_1.default.get('https://www.googleapis.com/youtube/v3/search', {
            params: {
                part: 'snippet',
                type: 'video',
                maxResults: 10,
                q,
                key,
                ...(opts?.videoDuration ? { videoDuration: opts.videoDuration } : {}),
            },
            timeout: 12000,
        });
        const items = data.items ?? [];
        return {
            count: items.length,
            titles: items
                .map(i => i.snippet?.title)
                .filter((t) => typeof t === 'string')
                .slice(0, 8),
        };
    }
    catch (e) {
        logger_1.logger.warn({ err: e, videoDuration: opts?.videoDuration }, 'YouTube search failed');
        return { count: 0, titles: [] };
    }
}
