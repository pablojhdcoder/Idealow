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
const prisma_1 = require("../lib/prisma");
const router = (0, express_1.Router)();
const allowedMimeTypes = new Set([
    'text/plain',
    'text/markdown',
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
        if (!allowedMimeTypes.has(file.mimetype)) {
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
exports.default = router;
