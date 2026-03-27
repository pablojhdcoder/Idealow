"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.feedListRateLimit = exports.ideasFeedbackPostRateLimit = exports.ideasPatchRateLimit = exports.semanticExploreRateLimit = exports.ideasValidationSseRateLimit = exports.ideasValidationRateLimit = exports.ideasRefineRateLimit = exports.suggestionsRateLimit = exports.ideasCreateRateLimit = exports.filesUploadRateLimit = exports.authRegisterRateLimit = exports.authLoginRateLimit = exports.createRateLimit = void 0;
const express_rate_limit_1 = require("express-rate-limit");
const apiError_1 = require("../lib/apiError");
const resolveClientId = (req) => {
    if (req.user?.userId) {
        return `user:${req.user.userId}`;
    }
    if (req.ip) {
        return `ip:${(0, express_rate_limit_1.ipKeyGenerator)(req.ip)}`;
    }
    return 'ip:unknown';
};
const createRateLimit = ({ windowMs, max, message, code }) => (0, express_rate_limit_1.rateLimit)({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: resolveClientId,
    handler: (_req, res) => {
        return (0, apiError_1.sendError)(res, 429, message, code);
    },
});
exports.createRateLimit = createRateLimit;
exports.authLoginRateLimit = (0, exports.createRateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many login attempts. Please try again later.',
    code: 'RATE_LIMIT_AUTH_LOGIN',
});
exports.authRegisterRateLimit = (0, exports.createRateLimit)({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: 'Too many registration attempts. Please try again later.',
    code: 'RATE_LIMIT_AUTH_REGISTER',
});
exports.filesUploadRateLimit = (0, exports.createRateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: 'Upload rate limit exceeded. Please try again later.',
    code: 'RATE_LIMIT_FILES_UPLOAD',
});
exports.ideasCreateRateLimit = (0, exports.createRateLimit)({
    windowMs: 10 * 60 * 1000,
    max: 10,
    message: 'Idea creation rate limit exceeded. Please try again later.',
    code: 'RATE_LIMIT_IDEAS_CREATE',
});
exports.suggestionsRateLimit = (0, exports.createRateLimit)({
    windowMs: 10 * 60 * 1000,
    max: 20,
    message: 'Suggestions rate limit exceeded. Please try again later.',
    code: 'RATE_LIMIT_USERS_SUGGESTIONS',
});
exports.ideasRefineRateLimit = (0, exports.createRateLimit)({
    windowMs: 10 * 60 * 1000,
    max: 30,
    message: 'Idea refinement rate limit exceeded. Please try again later.',
    code: 'RATE_LIMIT_IDEAS_REFINE',
});
exports.ideasValidationRateLimit = (0, exports.createRateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 15,
    message: 'Validation rate limit exceeded. Please try again later.',
    code: 'RATE_LIMIT_IDEAS_VALIDATION',
});
/** Aperturas del stream SSE (cada GET cuenta al inicio; conexiones largas no multiplican). */
exports.ideasValidationSseRateLimit = (0, exports.createRateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: 'Validation stream rate limit exceeded. Please try again later.',
    code: 'RATE_LIMIT_IDEAS_VALIDATION_SSE',
});
/** Búsqueda semántica y similares (embeddings / pgvector). */
exports.semanticExploreRateLimit = (0, exports.createRateLimit)({
    windowMs: 10 * 60 * 1000,
    max: 40,
    message: 'Semantic explore rate limit exceeded. Please try again later.',
    code: 'RATE_LIMIT_SEMANTIC_EXPLORE',
});
exports.ideasPatchRateLimit = (0, exports.createRateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: 'Idea update rate limit exceeded. Please try again later.',
    code: 'RATE_LIMIT_IDEAS_PATCH',
});
exports.ideasFeedbackPostRateLimit = (0, exports.createRateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 60,
    message: 'Feedback rate limit exceeded. Please try again later.',
    code: 'RATE_LIMIT_IDEAS_FEEDBACK',
});
exports.feedListRateLimit = (0, exports.createRateLimit)({
    windowMs: 60 * 1000,
    max: 120,
    message: 'Feed rate limit exceeded. Please try again later.',
    code: 'RATE_LIMIT_FEED_LIST',
});
