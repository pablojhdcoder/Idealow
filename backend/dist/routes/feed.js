"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const apiError_1 = require("../lib/apiError");
const rateLimit_1 = require("../middleware/rateLimit");
const idea_1 = require("../schemas/idea");
const listPublishedFeed_1 = require("../services/feed/listPublishedFeed");
const router = (0, express_1.Router)();
router.get('/', rateLimit_1.feedListRateLimit, async (req, res, next) => {
    try {
        const parsed = idea_1.feedQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return (0, apiError_1.sendError)(res, 422, 'Validation failed', 'VALIDATION_ERROR', parsed.error.flatten());
        }
        const q = parsed.data;
        const limit = q.limit ?? 20;
        const sort = q.sort ?? 'new';
        const filter = q.filter ?? 'all';
        const result = await (0, listPublishedFeed_1.listPublishedFeed)({
            limit,
            cursor: q.cursor,
            page: q.page,
            sector: q.sector,
            sort,
            filter,
            q: q.q,
        });
        return res.json({
            items: result.items,
            nextCursor: result.nextCursor,
            nextPage: result.nextPage,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
