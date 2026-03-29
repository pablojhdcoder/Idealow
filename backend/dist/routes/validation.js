"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const apiError_1 = require("../lib/apiError");
const logger_1 = require("../lib/logger");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const rateLimit_1 = require("../middleware/rateLimit");
const validate_1 = require("../middleware/validate");
const runValidation_1 = require("../services/validation/runValidation");
const sseHub_1 = require("../services/validation/sseHub");
const router = (0, express_1.Router)();
const ideaIdParamsSchema = zod_1.z.object({ id: zod_1.z.string().uuid() });
router.post('/ideas/:id/validate', auth_1.requireAuth, rateLimit_1.ideasValidationRateLimit, (0, validate_1.validateParams)(ideaIdParamsSchema), async (req, res, next) => {
    try {
        if (!req.user) {
            return (0, apiError_1.sendError)(res, 401, 'Unauthorized', 'AUTH_UNAUTHORIZED');
        }
        const { id } = req.params;
        const idea = await prisma_1.prisma.idea.findFirst({
            where: { id, userId: req.user.userId },
            select: { id: true, status: true, validationScore: true, validationData: true },
        });
        if (!idea) {
            return (0, apiError_1.sendError)(res, 404, 'Idea not found', 'VALIDATION_IDEA_NOT_FOUND');
        }
        if (idea.validationScore != null && idea.validationData != null) {
            return res.json({ status: 'already_validated', ideaId: id });
        }
        if (idea.status !== 'REFINING' && idea.status !== 'VALIDATED') {
            return (0, apiError_1.sendError)(res, 400, 'Refine the idea before running validation.', 'VALIDATION_BAD_STATUS');
        }
        void (0, runValidation_1.runValidation)(id, req.user.userId).catch(err => {
            logger_1.logger.error({ ideaId: id, err }, 'runValidation failed');
        });
        return res.json({ status: 'started', ideaId: id });
    }
    catch (err) {
        next(err);
    }
});
router.get('/ideas/:id/validate/stream', auth_1.requireAuth, rateLimit_1.ideasValidationSseRateLimit, (0, validate_1.validateParams)(ideaIdParamsSchema), async (req, res) => {
    if (!req.user) {
        return (0, apiError_1.sendError)(res, 401, 'Unauthorized', 'AUTH_UNAUTHORIZED');
    }
    const { id } = req.params;
    const idea = await prisma_1.prisma.idea.findFirst({
        where: { id, userId: req.user.userId },
        select: { id: true },
    });
    if (!idea) {
        return (0, apiError_1.sendError)(res, 404, 'Idea not found', 'VALIDATION_IDEA_NOT_FOUND');
    }
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') {
        res.flushHeaders();
    }
    // Antes de registrar: primer chunk para proxies que bufferizan SSE; el cliente arranca el POST al leer `ready`.
    res.write(`data: ${JSON.stringify({ type: 'ready' })}\n\n`);
    (0, sseHub_1.registerValidationSseClient)(id, res);
    req.on('close', () => {
        (0, sseHub_1.unregisterValidationSseClient)(id, res);
    });
});
exports.default = router;
