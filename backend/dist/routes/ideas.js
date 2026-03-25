"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const apiError_1 = require("../lib/apiError");
const httpError_1 = require("../lib/httpError");
const auth_1 = require("../middleware/auth");
const rateLimit_1 = require("../middleware/rateLimit");
const validate_1 = require("../middleware/validate");
const logger_1 = require("../lib/logger");
const idea_1 = require("../schemas/idea");
const ideas_1 = require("../services/ideas");
const refinement_1 = require("../services/ideas/refinement");
const cleanupOrphanedUploads_1 = require("../services/files/cleanupOrphanedUploads");
const router = (0, express_1.Router)();
const ideaIdParamsSchema = zod_1.z.object({ id: zod_1.z.string().uuid() });
/** No borrar adjuntos en errores de validación / recurso incorrecto (nunca llegamos a “consumir” la subida en una idea). */
function shouldCleanupOrphanUploadsAfterCreateError(err) {
    if (!(err instanceof httpError_1.HttpError)) {
        return true;
    }
    const skip = new Set([
        'IDEAS_FILE_NOT_FOUND',
        'IDEAS_FILE_ALREADY_ATTACHED',
        'IDEAS_NO_CONTENT',
    ]);
    return !skip.has(err.code);
}
router.get('/', auth_1.requireAuth, async (req, res, next) => {
    try {
        if (!req.user) {
            return (0, apiError_1.sendError)(res, 401, 'Unauthorized', 'AUTH_UNAUTHORIZED');
        }
        const parsed = idea_1.listIdeasQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return (0, apiError_1.sendError)(res, 422, 'Validation failed', 'VALIDATION_ERROR', parsed.error.flatten());
        }
        const result = await (0, ideas_1.listIdeasForUser)(req.user.userId, parsed.data);
        return res.json(result);
    }
    catch (err) {
        next(err);
    }
});
const createIdeaHandler = async (req, res, next) => {
    try {
        if (!req.user) {
            return (0, apiError_1.sendError)(res, 401, 'Unauthorized', 'AUTH_UNAUTHORIZED');
        }
        const userId = req.user.userId;
        const { content, fileId, fileIds, sector } = req.body;
        const mergedIds = [...new Set([...(fileIds ?? []), ...(fileId ? [fileId] : [])])];
        const result = await (0, ideas_1.createIdeaFromInput)({
            userId,
            content,
            fileId,
            fileIds: mergedIds.length > 0 ? mergedIds : undefined,
            sector,
        });
        return res.status(201).json(result);
    }
    catch (err) {
        if (req.user && shouldCleanupOrphanUploadsAfterCreateError(err)) {
            const { fileId, fileIds } = req.body;
            const mergedIds = [...new Set([...(fileIds ?? []), ...(fileId ? [fileId] : [])])];
            if (mergedIds.length > 0) {
                try {
                    const cleanup = await (0, cleanupOrphanedUploads_1.cleanupOrphanedUploads)({
                        userId: req.user.userId,
                        fileIds: mergedIds,
                    });
                    if (cleanup.filesystemErrors > 0) {
                        logger_1.logger.warn({
                            userId: req.user.userId,
                            fileIds: mergedIds,
                            cleanup,
                        }, 'Partial cleanup after failed idea creation');
                    }
                }
                catch (cleanupError) {
                    logger_1.logger.warn({
                        userId: req.user.userId,
                        fileIds: mergedIds,
                        cleanupError,
                    }, 'Cleanup failed after idea creation error');
                }
            }
        }
        next(err);
    }
};
router.post('/', auth_1.requireAuth, rateLimit_1.ideasCreateRateLimit, (0, validate_1.validateBody)(idea_1.createIdeaSchema), createIdeaHandler);
router.post('/:id/refine/questions', auth_1.requireAuth, rateLimit_1.ideasRefineRateLimit, (0, validate_1.validateParams)(ideaIdParamsSchema), async (req, res, next) => {
    try {
        if (!req.user) {
            return (0, apiError_1.sendError)(res, 401, 'Unauthorized', 'AUTH_UNAUTHORIZED');
        }
        const { id } = req.params;
        const questions = await (0, refinement_1.loadRefinementQuestions)(req.user.userId, id);
        return res.json(questions);
    }
    catch (err) {
        next(err);
    }
});
router.post('/:id/refine/answers', auth_1.requireAuth, rateLimit_1.ideasRefineRateLimit, (0, validate_1.validateParams)(ideaIdParamsSchema), (0, validate_1.validateBody)(idea_1.refineAnswersBodySchema), async (req, res, next) => {
    try {
        if (!req.user) {
            return (0, apiError_1.sendError)(res, 401, 'Unauthorized', 'AUTH_UNAUTHORIZED');
        }
        const { id } = req.params;
        const { answers } = req.body;
        const result = await (0, refinement_1.submitRefinement)(req.user.userId, id, answers);
        return res.json(result);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
