"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadRefinementQuestions = loadRefinementQuestions;
exports.submitRefinement = submitRefinement;
const prisma_1 = require("../../lib/prisma");
const httpError_1 = require("../../lib/httpError");
const refiner_1 = require("../ai/refiner");
function extractionFromRefinedContent(refinedContent, fallbackSummary) {
    if (refinedContent && typeof refinedContent === 'object' && !Array.isArray(refinedContent)) {
        const o = refinedContent;
        const base = o.refined != null && typeof o.refined === 'object' ? o.refined : o;
        return {
            problem: typeof base.problem === 'string' && base.problem.trim() ? base.problem : fallbackSummary ?? '',
            solution: typeof base.solution === 'string' ? base.solution : '',
            target_audience: typeof base.target_audience === 'string' ? base.target_audience : '',
        };
    }
    return {
        problem: fallbackSummary ?? '',
        solution: '',
        target_audience: '',
    };
}
async function loadRefinementQuestions(userId, ideaId) {
    const idea = await prisma_1.prisma.idea.findFirst({
        where: { id: ideaId, userId },
    });
    if (!idea) {
        throw new httpError_1.HttpError(404, 'Idea not found', 'IDEAS_NOT_FOUND');
    }
    const { problem, solution, target_audience } = extractionFromRefinedContent(idea.refinedContent, idea.summary);
    return (0, refiner_1.generateQuestions)({
        title: idea.title,
        problem,
        solution,
        target_audience,
        sector: idea.sector ?? 'other',
    });
}
async function submitRefinement(userId, ideaId, answers) {
    const idea = await prisma_1.prisma.idea.findFirst({
        where: { id: ideaId, userId },
        include: { user: true },
    });
    if (!idea) {
        throw new httpError_1.HttpError(404, 'Idea not found', 'IDEAS_NOT_FOUND');
    }
    const prevContent = idea.refinedContent && typeof idea.refinedContent === 'object' && !Array.isArray(idea.refinedContent)
        ? idea.refinedContent
        : {};
    const refined = await (0, refiner_1.synthesizeAnswers)(prevContent, answers, {
        sectors: idea.user.sectors,
        goal: idea.user.goal,
    });
    const nextRefinedContent = {
        ...prevContent,
        refined,
        wizardAnswers: answers,
    };
    const updated = await prisma_1.prisma.idea.update({
        where: { id: idea.id },
        data: {
            refinedContent: nextRefinedContent,
            title: refined.refined_title || idea.title,
            summary: refined.elevator_pitch,
            status: 'REFINING',
        },
    });
    return { idea: updated, nextStep: 'validation' };
}
