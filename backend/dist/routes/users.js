"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const prisma_1 = require("../lib/prisma");
const ai_1 = require("../services/ai");
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
        return res.status(500).json({ error: 'Failed to update profile' });
    }
});
router.get('/suggestions', auth_1.requireAuth, async (req, res) => {
    try {
        const request = req;
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: request.user.userId },
            select: { sectors: true, goal: true, experienceLevel: true },
        });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        const suggestions = await (0, ai_1.generateSuggestions)(user);
        return res.json({ suggestions });
    }
    catch {
        return res.status(500).json({ error: 'Failed to generate suggestions' });
    }
});
exports.default = router;
