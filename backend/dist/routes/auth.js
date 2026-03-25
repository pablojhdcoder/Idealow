"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../lib/prisma");
const apiError_1 = require("../lib/apiError");
const jwt_1 = require("../lib/jwt");
const rateLimit_1 = require("../middleware/rateLimit");
const validate_1 = require("../middleware/validate");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    username: zod_1.z.string().min(3).max(30),
    password: zod_1.z.string().min(8),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string(),
});
const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
};
router.post('/register', rateLimit_1.authRegisterRateLimit, (0, validate_1.validateBody)(registerSchema), async (req, res) => {
    try {
        const { email, username, password } = req.body;
        const existing = await prisma_1.prisma.user.findFirst({
            where: { OR: [{ email }, { username }] },
        });
        if (existing) {
            return (0, apiError_1.sendError)(res, 409, 'Email or username already taken', 'AUTH_REGISTER_CONFLICT');
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        const user = await prisma_1.prisma.user.create({
            data: { email, username, passwordHash },
            select: { id: true, email: true, username: true, sectors: true, goal: true },
        });
        res.cookie('token', (0, jwt_1.signToken)(user.id), cookieOpts);
        return res.json({ user, needsOnboarding: true });
    }
    catch {
        return (0, apiError_1.sendError)(res, 500, 'Registration failed', 'AUTH_REGISTER_FAILED');
    }
});
router.post('/login', rateLimit_1.authLoginRateLimit, (0, validate_1.validateBody)(loginSchema), async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user)
            return (0, apiError_1.sendError)(res, 401, 'Invalid credentials', 'AUTH_INVALID_CREDENTIALS');
        const valid = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!valid)
            return (0, apiError_1.sendError)(res, 401, 'Invalid credentials', 'AUTH_INVALID_CREDENTIALS');
        res.cookie('token', (0, jwt_1.signToken)(user.id), cookieOpts);
        return res.json({
            user: { id: user.id, email: user.email, username: user.username, sectors: user.sectors, goal: user.goal },
            needsOnboarding: user.sectors.length === 0,
        });
    }
    catch {
        return (0, apiError_1.sendError)(res, 500, 'Login failed', 'AUTH_LOGIN_FAILED');
    }
});
router.post('/logout', (_req, res) => {
    res.clearCookie('token');
    return res.json({ success: true });
});
router.get('/me', async (req, res) => {
    const token = req.cookies?.token;
    if (!token)
        return (0, apiError_1.sendError)(res, 401, 'Not authenticated', 'AUTH_NOT_AUTHENTICATED');
    try {
        const { userId } = (0, jwt_1.verifyToken)(token);
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
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
        if (!user)
            return (0, apiError_1.sendError)(res, 404, 'User not found', 'AUTH_USER_NOT_FOUND');
        return res.json({ user });
    }
    catch {
        return (0, apiError_1.sendError)(res, 401, 'Invalid token', 'AUTH_INVALID_TOKEN');
    }
});
exports.default = router;
