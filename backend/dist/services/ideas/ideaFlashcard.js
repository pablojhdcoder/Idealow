"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVoteCountsForIdeaIds = getVoteCountsForIdeaIds;
exports.getMyVote = getMyVote;
exports.mapIdeaRowToFlashcard = mapIdeaRowToFlashcard;
exports.getIdeaFlashcardForViewer = getIdeaFlashcardForViewer;
const prisma_1 = require("../../lib/prisma");
const httpError_1 = require("../../lib/httpError");
function asRecord(v) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
        return v;
    }
    return null;
}
function pickString(obj, key) {
    const x = obj[key];
    return typeof x === 'string' ? x.trim() : '';
}
function verdictFromScore(score) {
    if (score == null || Number.isNaN(score))
        return 'NO_SIGNAL';
    if (score >= 75)
        return 'STRONG_SIGNAL';
    if (score >= 55)
        return 'MODERATE_SIGNAL';
    if (score >= 35)
        return 'WEAK_SIGNAL';
    return 'NO_SIGNAL';
}
function parseVerdict(validationData, validationScore) {
    const root = asRecord(validationData);
    const v = root && typeof root.verdict === 'string' ? root.verdict.trim() : '';
    if (v === 'STRONG_SIGNAL' ||
        v === 'MODERATE_SIGNAL' ||
        v === 'WEAK_SIGNAL' ||
        v === 'NO_SIGNAL') {
        return v;
    }
    return verdictFromScore(validationScore);
}
function parseBreakdown(validationData) {
    const root = asRecord(validationData);
    const b = root ? root.breakdown : null;
    const br = asRecord(b);
    if (!br)
        return null;
    const out = {};
    for (const [k, val] of Object.entries(br)) {
        const o = asRecord(val);
        if (!o)
            continue;
        const score = typeof o.score === 'number' ? o.score : null;
        const weight = typeof o.weight === 'number' ? o.weight : 0;
        const contribution = typeof o.contribution === 'number' ? o.contribution : null;
        out[k] = { score, weight, contribution };
    }
    return Object.keys(out).length > 0 ? out : null;
}
function parseCompetitors(raw) {
    if (!Array.isArray(raw))
        return [];
    return raw
        .map((item) => {
        const o = asRecord(item);
        if (!o)
            return null;
        const name = pickString(o, 'name');
        if (!name)
            return null;
        return {
            name,
            url: pickString(o, 'url') || undefined,
            description: pickString(o, 'description') || undefined,
            strength: pickString(o, 'strength') || undefined,
            weakness: pickString(o, 'weakness') || undefined,
            approximateUsers: pickString(o, 'approximate_users') || undefined,
        };
    })
        .filter((x) => x != null);
}
function refinedShape(refinedContent, fallback) {
    const root = asRecord(refinedContent);
    const refined = root ? asRecord(root.refined) : null;
    const from = refined ?? root ?? {};
    return {
        refinedTitle: pickString(from, 'refined_title') || pickString(root ?? {}, 'title') || fallback.title,
        elevatorPitch: pickString(from, 'elevator_pitch') || (fallback.summary ?? '').trim() || pickString(root ?? {}, 'elevator_pitch'),
        problemStatement: pickString(from, 'problem_statement') || pickString(root ?? {}, 'problem') || '',
        solution: pickString(from, 'solution') || pickString(root ?? {}, 'solution') || '',
        targetCustomer: pickString(from, 'target_customer') || pickString(root ?? {}, 'target_audience') || '',
        monetization: pickString(from, 'monetization') || '',
        mvpFeature: pickString(from, 'mvp_feature') || '',
        distribution: pickString(from, 'distribution') || '',
        whyNow: pickString(from, 'why_now') || '',
        biggestRisk: pickString(from, 'biggest_risk') || '',
    };
}
async function getVoteCountsForIdeaIds(ideaIds) {
    const map = new Map();
    for (const id of ideaIds) {
        map.set(id, { useful: 0, interesting: 0, notUseful: 0 });
    }
    if (ideaIds.length === 0)
        return map;
    const rows = await prisma_1.prisma.ideaFeedback.groupBy({
        by: ['ideaId', 'vote'],
        where: { ideaId: { in: ideaIds } },
        _count: { _all: true },
    });
    for (const row of rows) {
        const cur = map.get(row.ideaId);
        if (!cur)
            continue;
        const n = row._count._all;
        if (row.vote === 'USEFUL')
            cur.useful += n;
        else if (row.vote === 'INTERESTING')
            cur.interesting += n;
        else if (row.vote === 'NOT_USEFUL')
            cur.notUseful += n;
    }
    return map;
}
async function getMyVote(ideaId, userId) {
    if (!userId)
        return null;
    const row = await prisma_1.prisma.ideaFeedback.findUnique({
        where: { ideaId_userId: { ideaId, userId } },
        select: { vote: true },
    });
    const v = row?.vote;
    if (v === 'USEFUL' || v === 'INTERESTING' || v === 'NOT_USEFUL')
        return v;
    return null;
}
function mapIdeaRowToFlashcard(idea, votes, myVote) {
    const r = refinedShape(idea.refinedContent, { title: idea.title, summary: idea.summary });
    const sector = (idea.sector ?? 'other').toLowerCase() || 'other';
    return {
        id: idea.id,
        refinedTitle: r.refinedTitle,
        elevatorPitch: r.elevatorPitch || (idea.summary ?? ''),
        sector,
        validationScore: idea.validationScore ?? 0,
        verdict: parseVerdict(idea.validationData, idea.validationScore),
        problemStatement: r.problemStatement,
        solution: r.solution,
        targetCustomer: r.targetCustomer,
        monetization: r.monetization,
        mvpFeature: r.mvpFeature,
        distribution: r.distribution,
        whyNow: r.whyNow,
        biggestRisk: r.biggestRisk,
        competitors: parseCompetitors(idea.competitors),
        validationBreakdown: parseBreakdown(idea.validationData),
        isPublished: idea.isPublished,
        publishedAt: idea.publishedAt ? idea.publishedAt.toISOString() : null,
        author: {
            username: idea.user.username,
            avatarUrl: idea.user.avatarUrl,
        },
        communityVotes: votes,
        createdAt: idea.createdAt.toISOString(),
        status: idea.status,
        myVote,
    };
}
async function getIdeaFlashcardForViewer(ideaId, viewerUserId) {
    const idea = await prisma_1.prisma.idea.findUnique({
        where: { id: ideaId },
        include: {
            user: { select: { username: true, avatarUrl: true } },
        },
    });
    if (!idea) {
        throw new httpError_1.HttpError(404, 'Idea not found', 'IDEAS_NOT_FOUND');
    }
    const isOwner = viewerUserId != null && idea.userId === viewerUserId;
    if (!isOwner && !idea.isPublished) {
        throw new httpError_1.HttpError(404, 'Idea not found', 'IDEAS_NOT_FOUND');
    }
    const voteMap = await getVoteCountsForIdeaIds([ideaId]);
    const votes = voteMap.get(ideaId) ?? { useful: 0, interesting: 0, notUseful: 0 };
    const myVote = await getMyVote(ideaId, viewerUserId);
    const flashcard = mapIdeaRowToFlashcard({
        id: idea.id,
        title: idea.title,
        summary: idea.summary,
        sector: idea.sector,
        status: idea.status,
        refinedContent: idea.refinedContent,
        validationScore: idea.validationScore,
        validationData: idea.validationData,
        competitors: idea.competitors,
        isPublished: idea.isPublished,
        publishedAt: idea.publishedAt,
        createdAt: idea.createdAt,
        user: idea.user,
    }, votes, myVote);
    return { flashcard, isOwner };
}
