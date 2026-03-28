"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
const express_1 = require("express");
const config_1 = require("../config");
const apiError_1 = require("../lib/apiError");
const auth_1 = require("../middleware/auth");
const rateLimit_1 = require("../middleware/rateLimit");
const validate_1 = require("../middleware/validate");
const prisma_1 = require("../lib/prisma");
const cleanupOrphanedUploads_1 = require("../services/files/cleanupOrphanedUploads");
const files_1 = require("../schemas/files");
const router = (0, express_1.Router)();
const allowedMimeTypes = new Set([
    'text/plain',
    'text/markdown',
    'text/x-markdown',
    'application/pdf',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/mp4',
    'audio/x-m4a',
    'audio/ogg',
    'video/mp4',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
]);
/** Algunos SO/navegadores envían `application/octet-stream` o vacío para .md / .txt. */
const textExtensionsForAmbiguousMime = new Set(['txt', 'md', 'markdown']);
function isAllowedUploadFile(file) {
    if (allowedMimeTypes.has(file.mimetype))
        return true;
    const ext = path_1.default.extname(file.originalname).replace(/^\./, '').toLowerCase();
    if (!textExtensionsForAmbiguousMime.has(ext))
        return false;
    return file.mimetype === 'application/octet-stream' || file.mimetype === '';
}
if (!fs_1.default.existsSync(config_1.config.uploadDir)) {
    fs_1.default.mkdirSync(config_1.config.uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, config_1.config.uploadDir),
    filename: (_req, file, cb) => {
        const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, `${Date.now()}-${safe}`);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: config_1.config.maxUploadMb * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (!isAllowedUploadFile(file)) {
            cb(new Error('Unsupported file type'));
            return;
        }
        cb(null, true);
    },
});
const uploadSingle = (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err instanceof multer_1.default.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return (0, apiError_1.sendError)(res, 413, `File too large (max ${config_1.config.maxUploadMb}MB)`, 'FILES_TOO_LARGE');
            }
            return (0, apiError_1.sendError)(res, 422, err.message, 'FILES_UPLOAD_INVALID');
        }
        if (err instanceof Error) {
            if (err.message === 'Unsupported file type') {
                return (0, apiError_1.sendError)(res, 422, err.message, 'FILES_UNSUPPORTED_TYPE');
            }
            return (0, apiError_1.sendError)(res, 422, err.message, 'FILES_UPLOAD_INVALID');
        }
        if (err) {
            return (0, apiError_1.sendError)(res, 500, 'Upload failed', 'FILES_UPLOAD_FAILED');
        }
        next();
    });
};
router.post('/upload', auth_1.requireAuth, rateLimit_1.filesUploadRateLimit, uploadSingle, async (req, res) => {
    try {
        const request = req;
        if (!req.file || !request.user) {
            return (0, apiError_1.sendError)(res, 422, 'File is required', 'FILES_REQUIRED');
        }
        const created = await prisma_1.prisma.file.create({
            data: {
                userId: request.user.userId,
                filepath: path_1.default.resolve(req.file.path),
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                sizeBytes: req.file.size,
            },
        });
        const safeFile = {
            id: created.id,
            userId: created.userId,
            originalName: created.originalName,
            mimeType: created.mimeType,
            sizeBytes: created.sizeBytes,
            createdAt: created.createdAt,
        };
        return res.json({ fileId: created.id, file: safeFile });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to upload file';
        if (message === 'Unsupported file type') {
            return (0, apiError_1.sendError)(res, 422, message, 'FILES_UNSUPPORTED_TYPE');
        }
        return (0, apiError_1.sendError)(res, 500, 'Failed to upload file', 'FILES_UPLOAD_FAILED');
    }
});
router.post('/abandon-uploads', auth_1.requireAuth, (0, validate_1.validateBody)(files_1.abandonUploadsBodySchema), async (req, res, next) => {
    try {
        const request = req;
        if (!request.user) {
            return (0, apiError_1.sendError)(res, 401, 'Unauthorized', 'AUTH_UNAUTHORIZED');
        }
        const { fileIds } = req.body;
        const result = await (0, cleanupOrphanedUploads_1.cleanupOrphanedUploads)({
            userId: request.user.userId,
            fileIds,
        });
        return res.json({ ok: true, ...result });
    }
    catch (err) {
        next(err);
    }
});
const uuidParam = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
router.get('/:id', auth_1.optionalAuth, async (req, res) => {
    try {
        const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0] ?? '';
        if (!uuidParam.test(id)) {
            return (0, apiError_1.sendError)(res, 404, 'File not found', 'FILES_NOT_FOUND');
        }
        const file = await prisma_1.prisma.file.findUnique({ where: { id } });
        if (!file) {
            return (0, apiError_1.sendError)(res, 404, 'File not found', 'FILES_NOT_FOUND');
        }
        const request = req;
        const isFileUploader = request.user?.userId === file.userId;
        let allowed = isFileUploader;
        if (!allowed && file.ideaId) {
            const idea = await prisma_1.prisma.idea.findUnique({
                where: { id: file.ideaId },
                select: { userId: true, isPublished: true },
            });
            if (idea?.isPublished) {
                allowed = true;
            }
            else if (idea && request.user?.userId === idea.userId) {
                allowed = true;
            }
        }
        if (!allowed) {
            if (!file.mimeType.startsWith('image/')) {
                return (0, apiError_1.sendError)(res, 403, 'Forbidden', 'FILES_FORBIDDEN');
            }
            const usedAsAvatar = await prisma_1.prisma.user.findFirst({
                where: { avatarUrl: `/api/files/${id}` },
                select: { id: true },
            });
            allowed = Boolean(usedAsAvatar);
        }
        if (!allowed) {
            return (0, apiError_1.sendError)(res, 403, 'Forbidden', 'FILES_FORBIDDEN');
        }
        const resolvedPath = path_1.default.resolve(file.filepath);
        const uploadRoot = path_1.default.resolve(config_1.config.uploadDir);
        const relativeToUpload = path_1.default.relative(uploadRoot, resolvedPath);
        if (relativeToUpload.startsWith('..') || path_1.default.isAbsolute(relativeToUpload)) {
            return (0, apiError_1.sendError)(res, 403, 'Forbidden', 'FILES_FORBIDDEN');
        }
        if (!fs_1.default.existsSync(file.filepath)) {
            return (0, apiError_1.sendError)(res, 404, 'File not found', 'FILES_NOT_FOUND');
        }
        res.setHeader('Content-Type', file.mimeType);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        const stream = fs_1.default.createReadStream(file.filepath);
        stream.on('error', () => {
            if (!res.headersSent) {
                (0, apiError_1.sendError)(res, 500, 'Failed to read file', 'FILES_READ_FAILED');
            }
        });
        stream.pipe(res);
    }
    catch {
        return (0, apiError_1.sendError)(res, 500, 'Failed to serve file', 'FILES_SERVE_FAILED');
    }
});
exports.default = router;
