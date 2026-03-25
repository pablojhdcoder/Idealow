"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractRssItemTitles = extractRssItemTitles;
/** Extrae títulos de ítems RSS/Atom sin dependencias XML (Google News RSS). */
function extractRssItemTitles(xml, limit = 20) {
    const titles = [];
    const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
    for (const block of itemBlocks) {
        if (titles.length >= limit)
            break;
        const m = block.match(/<title(?:[^>]*)>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*))<\/title>/i);
        if (!m)
            continue;
        const raw = (m[1] ?? m[2] ?? '').trim();
        const plain = raw.replace(/<[^>]+>/g, '').trim();
        if (plain.length > 2) {
            titles.push(plain);
        }
    }
    return titles;
}
