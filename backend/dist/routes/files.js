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
const auth_1 = require("../middleware/auth");
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
router.post('/upload', auth_1.requireAuth, upload.single('file'), async (req, res) => {
    try {
        const request = req;
        if (!req.file || !request.user) {
            return res.status(422).json({ error: 'File is required' });
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
        return res.json({ fileId: created.id, file: created });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to upload file';
        if (message === 'Unsupported file type') {
            return res.status(422).json({ error: message });
        }
        return res.status(500).json({ error: 'Failed to upload file' });
    }
});
exports.default = router;
