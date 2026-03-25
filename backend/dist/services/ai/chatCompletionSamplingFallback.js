"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUnsupportedSamplingParameterError = isUnsupportedSamplingParameterError;
exports.chatCompletionsCreateWithSamplingFallback = chatCompletionsCreateWithSamplingFallback;
const openai_1 = require("openai");
function errorText(error) {
    if (!(error instanceof openai_1.APIError))
        return '';
    const body = error.error;
    return `${error.message}\n${body?.message ?? ''}\n${body?.param ?? ''}`.toLowerCase();
}
/** 400 por parámetros de muestreo no soportados (p. ej. modelos de razonamiento en Azure). */
function isUnsupportedSamplingParameterError(error) {
    if (!(error instanceof openai_1.APIError) || error.status !== 400)
        return false;
    const t = errorText(error);
    return (t.includes('temperature') ||
        t.includes('top_p') ||
        t.includes('frequency_penalty') ||
        t.includes('presence_penalty'));
}
async function chatCompletionsCreateWithSamplingFallback(client, params) {
    try {
        return await client.chat.completions.create(params);
    }
    catch (e) {
        if (!isUnsupportedSamplingParameterError(e)) {
            throw e;
        }
        const { temperature: _temp, top_p: _topP, frequency_penalty: _fp, presence_penalty: _pp, ...rest } = params;
        return await client.chat.completions.create(rest);
    }
}
