"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listIdeasForUser = listIdeasForUser;
const prisma_1 = require("../../lib/prisma");
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
async function listIdeasForUser(userId, options = {}) {
    const limit = Math.min(options.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const take = limit + 1;
    const items = await prisma_1.prisma.idea.findMany({
        where: { userId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take,
        ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
        select: {
            id: true,
            title: true,
            summary: true,
            sector: true,
            status: true,
            isPublished: true,
            createdAt: true,
        },
    });
    const hasMore = items.length > limit;
    const ideas = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore && ideas.length > 0 ? ideas[ideas.length - 1].id : null;
    return { ideas, nextCursor };
}
