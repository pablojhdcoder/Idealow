"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchGoogleNewsTitles = fetchGoogleNewsTitles;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../../lib/logger");
const rssUtils_1 = require("./rssUtils");
async function fetchGoogleNewsTitles(searchQuery, limit = 18) {
    const q = searchQuery.trim().slice(0, 280);
    if (!q) {
        return [];
    }
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=es&gl=ES&ceid=ES:es`;
    try {
        const { data } = await axios_1.default.get(url, {
            timeout: 12000,
            headers: {
                'User-Agent': 'Idealow/1.0 (market-validation; +https://idealow.app)',
                Accept: 'application/rss+xml, application/xml, text/xml',
            },
        });
        return (0, rssUtils_1.extractRssItemTitles)(typeof data === 'string' ? data : String(data), limit);
    }
    catch (e) {
        logger_1.logger.warn({ err: e, q: q.slice(0, 80) }, 'Google News RSS fetch failed');
        return [];
    }
}
