"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const apiError_1 = require("../lib/apiError");
const auth_1 = require("../middleware/auth");
const rateLimit_1 = require("../middleware/rateLimit");
const validate_1 = require("../middleware/validate");
const prisma_1 = require("../lib/prisma");
const staticSuggestions_1 = require("../lib/staticSuggestions");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const profileSchema = zod_1.z.object({
    sectors: zod_1.z.array(zod_1.z.string()).min(1).max(5),
    experienceLevel: zod_1.z.enum(['BEGINNER', 'INTERMEDIATE', 'EXPERT', 'PROFESSIONAL']),
    goal: zod_1.z.enum(['HACKATHON', 'SIDE_PROJECT', 'STARTUP', 'LEARNING']),
});
router.patch('/profile', auth_1.requireAuth, (0, validate_1.validateBody)(profileSchema), async (req, res) => {
    try {
        const request = req;
        const user = await prisma_1.prisma.user.update({
            where: { id: request.user.userId },
            data: req.body,
            select: {
                id: true,
                email: true,
                username: true,
                sectors: true,
                goal: true,
                experienceLevel: true,
            },
        });
        return res.json({ user });
    }
    catch {
        return (0, apiError_1.sendError)(res, 500, 'Failed to update profile', 'USERS_PROFILE_UPDATE_FAILED');
    }
});
router.get('/suggestions', auth_1.requireAuth, rateLimit_1.suggestionsRateLimit, async (req, res) => {
    try {
        const request = req;
        const exists = await prisma_1.prisma.user.findUnique({
            where: { id: request.user.userId },
            select: { id: true },
        });
        if (!exists)
            return (0, apiError_1.sendError)(res, 404, 'User not found', 'USERS_NOT_FOUND');
        /** Ejemplos fijos (no se llama a ningún modelo). */
        return res.json({ suggestions: [...staticSuggestions_1.STATIC_IDEA_SUGGESTIONS] });
    }
    catch {
        return (0, apiError_1.sendError)(res, 500, 'Failed to generate suggestions', 'USERS_SUGGESTIONS_FAILED');
    }
});
exports.default = router;
