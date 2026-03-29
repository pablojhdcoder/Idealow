"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSocialEvidenceUrl = buildSocialEvidenceUrl;
/** URLs de búsqueda en la propia red (el usuario ve resultados reales al abrir). */
function buildSocialEvidenceUrl(platform, query) {
    const q = query.trim().slice(0, 200);
    if (!q) {
        return platform === 'x'
            ? 'https://x.com/explore'
            : platform === 'tiktok'
                ? 'https://www.tiktok.com/'
                : 'https://www.instagram.com/explore/';
    }
    const enc = encodeURIComponent(q);
    switch (platform) {
        case 'x':
            return `https://x.com/search?q=${enc}&src=typed_query`;
        case 'tiktok':
            return `https://www.tiktok.com/search?q=${enc}`;
        case 'instagram':
            return `https://www.instagram.com/explore/search/keyword/?q=${enc}`;
        default:
            return `https://www.google.com/search?q=${enc}`;
    }
}
