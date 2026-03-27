"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateIdeaPublishState = updateIdeaPublishState;
const prisma_1 = require("../../lib/prisma");
const httpError_1 = require("../../lib/httpError");
const embeddingJob_1 = require("../embeddings/embeddingJob");
async function updateIdeaPublishState(userId, ideaId, isPublished) {
    const idea = await prisma_1.prisma.idea.findFirst({
        where: { id: ideaId, userId },
        select: { id: true, status: true, isPublished: true, publishedAt: true },
    });
    if (!idea) {
        throw new httpError_1.HttpError(404, 'Idea not found', 'IDEAS_NOT_FOUND');
    }
    if (isPublished && idea.status !== 'VALIDATED') {
        throw new httpError_1.HttpError(400, 'Only validated ideas can be published to the community.', 'IDEAS_PUBLISH_NOT_VALIDATED');
    }
    const shouldPublishNow = isPublished && !idea.isPublished;
    const shouldUnpublishNow = !isPublished && idea.isPublished;
    if (!shouldPublishNow && !shouldUnpublishNow) {
        return {
            id: idea.id,
            isPublished: idea.isPublished,
            publishedAt: idea.publishedAt,
        };
    }
    const publishedAt = shouldPublishNow ? new Date() : null;
    const updated = await prisma_1.prisma.idea.update({
        where: { id: ideaId },
        data: {
            isPublished,
            publishedAt,
        },
        select: { id: true, isPublished: true, publishedAt: true },
    });
    (0, embeddingJob_1.scheduleIdeaEmbedding)(ideaId);
    return updated;
}
