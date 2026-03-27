"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const apiError_1 = require("../lib/apiError");
const auth_1 = require("../middleware/auth");
const rateLimit_1 = require("../middleware/rateLimit");
const validate_1 = require("../middleware/validate");
const prisma_1 = require("../lib/prisma");
const staticSuggestions_1 = require("../lib/staticSuggestions");
const avatarFile_1 = require("../services/users/avatarFile");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const avatarUrlField = zod_1.z
    .union([
    zod_1.z.string().url(),
    zod_1.z.literal(''),
    zod_1.z.string().regex(/^\/api\/files\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
])
    .optional();
const profileSchema = zod_1.z
    .object({
    sectors: zod_1.z.array(zod_1.z.string()).min(1).max(5).optional(),
    experienceLevel: zod_1.z.enum(['BEGINNER', 'INTERMEDIATE', 'EXPERT', 'PROFESSIONAL']).optional(),
    goal: zod_1.z.enum(['HACKATHON', 'SIDE_PROJECT', 'STARTUP', 'LEARNING']).optional(),
    avatarUrl: avatarUrlField,
    /** Fichero ya subido con `POST /api/files/upload` (imagen). */
    avatarFileId: zod_1.z.string().uuid().optional(),
})
    .refine(data => !(data.avatarFileId !== undefined && data.avatarUrl !== undefined), {
    message: 'Cannot send both avatarFileId and avatarUrl',
})
    .refine(data => data.sectors !== undefined ||
    data.experienceLevel !== undefined ||
    data.goal !== undefined ||
    data.avatarUrl !== undefined ||
    data.avatarFileId !== undefined, {
    message: 'At least one profile field must be provided',
});
router.patch('/profile', auth_1.requireAuth, (0, validate_1.validateBody)(profileSchema), async (req, res) => {
    try {
        const request = req;
        const parsed = profileSchema.parse(req.body);
        const previous = await prisma_1.prisma.user.findUnique({
            where: { id: request.user.userId },
            select: { avatarUrl: true },
        });
        let nextAvatarUrl;
        if (parsed.avatarFileId !== undefined) {
            const file = await prisma_1.prisma.file.findFirst({
                where: { id: parsed.avatarFileId, userId: request.user.userId },
            });
            if (!file || !file.mimeType.startsWith('image/')) {
                return (0, apiError_1.sendError)(res, 422, 'Invalid avatar image file', 'USERS_AVATAR_FILE_INVALID');
            }
            nextAvatarUrl = `/api/files/${file.id}`;
        }
        else if (parsed.avatarUrl !== undefined) {
            nextAvatarUrl =
                parsed.avatarUrl.trim().length > 0 ? parsed.avatarUrl.trim() : null;
        }
        const data = {
            ...(parsed.sectors !== undefined ? { sectors: parsed.sectors } : {}),
            ...(parsed.experienceLevel !== undefined ? { experienceLevel: parsed.experienceLevel } : {}),
            ...(parsed.goal !== undefined ? { goal: parsed.goal } : {}),
            ...(nextAvatarUrl !== undefined ? { avatarUrl: nextAvatarUrl } : {}),
        };
        const user = await prisma_1.prisma.user.update({
            where: { id: request.user.userId },
            data,
            select: {
                id: true,
                email: true,
                username: true,
                avatarUrl: true,
                sectors: true,
                goal: true,
                experienceLevel: true,
            },
        });
        if (nextAvatarUrl !== undefined && previous?.avatarUrl !== user.avatarUrl) {
            await (0, avatarFile_1.deleteOwnedAvatarFile)(request.user.userId, previous?.avatarUrl);
        }
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
