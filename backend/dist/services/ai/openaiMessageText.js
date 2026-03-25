"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completionContentToPlainText = completionContentToPlainText;
/** Normaliza `message.content` (string o lista de partes del SDK). */
function completionContentToPlainText(content) {
    if (content == null) {
        return '';
    }
    if (typeof content === 'string') {
        return content;
    }
    if (!Array.isArray(content)) {
        return '';
    }
    return content
        .map((part) => (part.type === 'text' && typeof part.text === 'string' ? part.text : ''))
        .join('');
}
