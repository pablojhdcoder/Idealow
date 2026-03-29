"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runValidation = runValidation;
const prisma_1 = require("../../lib/prisma");
const logger_1 = require("../../lib/logger");
const aggregator_1 = require("./aggregator");
const reddit_1 = require("./reddit");
const trends_1 = require("./trends");
const competitors_1 = require("./competitors");
const social_1 = require("./social");
const news_1 = require("./news");
const sseHub_1 = require("./sseHub");
const refinedToValidationInput_1 = require("./refinedToValidationInput");
const runningValidations = new Set();
function emit(ideaId, data) {
    (0, sseHub_1.emitValidationSse)(ideaId, data);
}
async function runValidation(ideaId, userId) {
    if (runningValidations.has(ideaId)) {
        logger_1.logger.info({ ideaId }, 'validation already running, skip duplicate');
        return;
    }
    runningValidations.add(ideaId);
    try {
        await executeValidation(ideaId, userId);
    }
    finally {
        runningValidations.delete(ideaId);
    }
}
async function executeValidation(ideaId, userId) {
    const idea = await prisma_1.prisma.idea.findFirst({
        where: { id: ideaId, userId },
    });
    if (!idea) {
        emit(ideaId, { type: 'error', code: 'VALIDATION_IDEA_NOT_FOUND', message: 'Idea not found' });
        return;
    }
    /** Una sola ejecución por idea: resultados persistidos en BD. */
    if (idea.validationScore != null && idea.validationData != null) {
        logger_1.logger.info({ ideaId }, 'validation already persisted, skip');
        return;
    }
    if (idea.status !== 'REFINING' && idea.status !== 'VALIDATED') {
        emit(ideaId, {
            type: 'error',
            code: 'VALIDATION_BAD_STATUS',
            message: 'Refine the idea before running validation.',
        });
        return;
    }
    const input = (0, refinedToValidationInput_1.refinedContentToValidationInput)(idea.refinedContent, idea.summary);
    if (!input) {
        emit(ideaId, {
            type: 'error',
            code: 'VALIDATION_NO_REFINED_CONTENT',
            message: 'Missing refined content to validate.',
        });
        return;
    }
    const [reddit, trends, competitors, social, news] = await Promise.allSettled([
        (async () => {
            emit(ideaId, { source: 'reddit', status: 'searching' });
            const r = await (0, reddit_1.validateReddit)(input);
            emit(ideaId, { source: 'reddit', status: 'done', ...r });
            return r;
        })(),
        (async () => {
            emit(ideaId, { source: 'trends', status: 'searching' });
            const r = await (0, trends_1.validateTrends)(input);
            emit(ideaId, { source: 'trends', status: 'done', ...r });
            return r;
        })(),
        (async () => {
            emit(ideaId, { source: 'competitors', status: 'searching' });
            const r = await (0, competitors_1.validateCompetitors)(input);
            emit(ideaId, { source: 'competitors', status: 'done', ...r });
            return r;
        })(),
        (async () => {
            emit(ideaId, { source: 'social', status: 'searching' });
            const r = await (0, social_1.validateSocial)(input);
            emit(ideaId, { source: 'social', status: 'done', ...r });
            return r;
        })(),
        (async () => {
            emit(ideaId, { source: 'news', status: 'searching' });
            const r = await (0, news_1.validateNews)(input);
            emit(ideaId, { source: 'news', status: 'done', ...r });
            return r;
        })(),
    ]);
    const results = {
        reddit: reddit.status === 'fulfilled' ? reddit.value : null,
        trends: trends.status === 'fulfilled' ? trends.value : null,
        competitors: competitors.status === 'fulfilled' ? competitors.value : null,
        social: social.status === 'fulfilled' ? social.value : null,
        news: news.status === 'fulfilled' ? news.value : null,
    };
    for (const [name, settled] of [
        ['reddit', reddit],
        ['trends', trends],
        ['competitors', competitors],
        ['social', social],
        ['news', news],
    ]) {
        if (settled.status === 'rejected') {
            logger_1.logger.warn({ ideaId, source: name, err: settled.reason }, 'validation source failed');
            emit(ideaId, {
                source: name,
                status: 'error',
                message: settled.reason instanceof Error ? settled.reason.message : 'Unknown error',
            });
        }
    }
    const scoreReport = (0, aggregator_1.aggregateScore)({
        reddit: results.reddit,
        trends: results.trends,
        competitors: results.competitors,
        social: results.social,
        news: results.news,
    });
    const competitorList = results.competitors?.competitors ?? [];
    await prisma_1.prisma.idea.update({
        where: { id: ideaId },
        data: {
            validationScore: scoreReport.validation_score,
            validationData: { ...results, ...scoreReport },
            competitors: competitorList,
            status: 'VALIDATED',
        },
    });
    emit(ideaId, { type: 'complete', ...scoreReport });
}
