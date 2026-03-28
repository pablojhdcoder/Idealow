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
const config_1 = require("../config");
const prisma_1 = require("../lib/prisma");
const similarity_1 = require("../services/embeddings/similarity");
const ideaFlashcard_1 = require("../services/ideas/ideaFlashcard");
const feedbackService_1 = require("../services/ideas/feedbackService");
const updateIdeaPublish_1 = require("../services/ideas/updateIdeaPublish");
const router = (0, express_1.Router)();
const ideaIdParamsSchema = zod_1.z.object({ id: zod_1.z.string().uuid() });
const similarQuerySchema = zod_1.z.object({
    limit: zod_1.z.coerce.number().int().min(1).max(20).optional(),
});
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
router.get('/:id/similar', auth_1.requireAuth, rateLimit_1.semanticExploreRateLimit, (0, validate_1.validateParams)(ideaIdParamsSchema), async (req, res, next) => {
    try {
        if (!req.user) {
            return (0, apiError_1.sendError)(res, 401, 'Unauthorized', 'AUTH_UNAUTHORIZED');
        }
        const { id } = req.params;
        const parsedQ = similarQuerySchema.safeParse(req.query);
        if (!parsedQ.success) {
            return (0, apiError_1.sendError)(res, 422, 'Validation failed', 'VALIDATION_ERROR', parsedQ.error.flatten());
        }
        const limit = parsedQ.data.limit ?? 8;
        const idea = await prisma_1.prisma.idea.findFirst({
            where: { id, userId: req.user.userId },
            select: { id: true },
        });
        if (!idea) {
            return (0, apiError_1.sendError)(res, 404, 'Idea not found', 'IDEAS_NOT_FOUND');
        }
        if (!(0, config_1.hasEmbeddingsConfig)()) {
            return (0, apiError_1.sendError)(res, 503, 'Similar ideas is not configured (set AZURE_OPENAI_DEPLOYMENT_EMBEDDINGS or EMBEDDING_MODEL).', 'SEMANTIC_NOT_CONFIGURED');
        }
        const ideas = await (0, similarity_1.similarIdeasForUser)(req.user.userId, id, limit);
        return res.json({ ideas });
    }
    catch (err) {
        next(err);
    }
});
router.get('/:id/feedback', (0, validate_1.validateParams)(ideaIdParamsSchema), async (req, res, next) => {
    try {
        const { id } = req.params;
        const parsed = idea_1.ideaFeedbackListQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return (0, apiError_1.sendError)(res, 422, 'Validation failed', 'VALIDATION_ERROR', parsed.error.flatten());
        }
        const limit = parsed.data.limit ?? 20;
        const { items, nextCursor } = await (0, feedbackService_1.listIdeaFeedbackComments)(id, {
            cursor: parsed.data.cursor,
            limit,
        });
        return res.json({
            comments: items.map(c => ({
                id: c.id,
                comment: c.comment,
                vote: c.vote,
                createdAt: c.createdAt.toISOString(),
                user: c.user,
            })),
            nextCursor,
        });
    }
    catch (err) {
        next(err);
    }
});
router.post('/:id/feedback', auth_1.requireAuth, rateLimit_1.ideasFeedbackPostRateLimit, (0, validate_1.validateParams)(ideaIdParamsSchema), (0, validate_1.validateBody)(idea_1.ideaFeedbackBodySchema), async (req, res, next) => {
    try {
        if (!req.user) {
            return (0, apiError_1.sendError)(res, 401, 'Unauthorized', 'AUTH_UNAUTHORIZED');
        }
        const { id } = req.params;
        const body = req.body;
        const result = await (0, feedbackService_1.submitIdeaFeedback)({
            ideaId: id,
            userId: req.user.userId,
            vote: body.vote,
            comment: body.comment,
        });
        return res.status(200).json(result);
    }
    catch (err) {
        next(err);
    }
});
router.patch('/:id', auth_1.requireAuth, rateLimit_1.ideasPatchRateLimit, (0, validate_1.validateParams)(ideaIdParamsSchema), (0, validate_1.validateBody)(idea_1.patchIdeaBodySchema), async (req, res, next) => {
    try {
        if (!req.user) {
            return (0, apiError_1.sendError)(res, 401, 'Unauthorized', 'AUTH_UNAUTHORIZED');
        }
        const { id } = req.params;
        const { isPublished } = req.body;
        const updated = await (0, updateIdeaPublish_1.updateIdeaPublishState)(req.user.userId, id, isPublished);
        return res.json({
            id: updated.id,
            isPublished: updated.isPublished,
            publishedAt: updated.publishedAt ? updated.publishedAt.toISOString() : null,
        });
    }
    catch (err) {
        next(err);
    }
});
router.get('/:id', auth_1.optionalAuth, (0, validate_1.validateParams)(ideaIdParamsSchema), async (req, res, next) => {
    try {
        const { id } = req.params;
        const viewerId = req.user?.userId;
        const { flashcard, isOwner } = await (0, ideaFlashcard_1.getIdeaFlashcardForViewer)(id, viewerId);
        const files = await prisma_1.prisma.file.findMany({
            where: { ideaId: id },
            select: {
                id: true,
                originalName: true,
                mimeType: true,
                sizeBytes: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
        });
        const attachments = files.map(f => ({
            id: f.id,
            originalName: f.originalName,
            mimeType: f.mimeType,
            sizeBytes: f.sizeBytes,
            createdAt: f.createdAt.toISOString(),
        }));
        return res.json({ flashcard, isOwner, attachments });
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
