"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const apiError_1 = require("../lib/apiError");
const auth_1 = require("../middleware/auth");
const rateLimit_1 = require("../middleware/rateLimit");
const config_1 = require("../config");
const similarity_1 = require("../services/embeddings/similarity");
const router = (0, express_1.Router)();
const searchQuerySchema = zod_1.z.object({
    q: zod_1.z.string().trim().min(1).max(500),
    limit: zod_1.z.coerce.number().int().min(1).max(20).optional(),
});
router.get('/search', auth_1.requireAuth, rateLimit_1.semanticExploreRateLimit, async (req, res, next) => {
    try {
        if (!req.user) {
            return (0, apiError_1.sendError)(res, 401, 'Unauthorized', 'AUTH_UNAUTHORIZED');
        }
        const parsed = searchQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return (0, apiError_1.sendError)(res, 422, 'Validation failed', 'VALIDATION_ERROR', parsed.error.flatten());
        }
        if (!(0, config_1.hasEmbeddingsConfig)()) {
            return (0, apiError_1.sendError)(res, 503, 'Semantic search is not configured (set AZURE_OPENAI_DEPLOYMENT_EMBEDDINGS or EMBEDDING_MODEL).', 'SEMANTIC_NOT_CONFIGURED');
        }
        const limit = parsed.data.limit ?? 10;
        const ideas = await (0, similarity_1.semanticSearchForUser)(req.user.userId, parsed.data.q, limit);
        return res.json({ ideas });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
