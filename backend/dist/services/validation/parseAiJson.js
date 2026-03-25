"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripMarkdownCodeFence = stripMarkdownCodeFence;
exports.parseJsonObject = parseJsonObject;
exports.parseJsonArray = parseJsonArray;
function stripMarkdownCodeFence(value) {
    const trimmed = value.trim();
    if (!trimmed.startsWith('```')) {
        return trimmed;
    }
    return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}
function parseJsonObject(raw) {
    const cleaned = stripMarkdownCodeFence(raw);
    try {
        const v = JSON.parse(cleaned);
        if (v && typeof v === 'object' && !Array.isArray(v)) {
            return v;
        }
    }
    catch {
        /* fallthrough */
    }
    return {};
}
function parseJsonArray(raw) {
    const cleaned = stripMarkdownCodeFence(raw);
    try {
        const v = JSON.parse(cleaned);
        return Array.isArray(v) ? v : [];
    }
    catch {
        return [];
    }
}
