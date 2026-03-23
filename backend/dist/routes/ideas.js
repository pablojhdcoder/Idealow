"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const idea_1 = require("../schemas/idea");
const extractor_1 = require("../services/ai/extractor");
const processor_1 = require("../services/media/processor");
const prisma_1 = require("../lib/prisma");
const router = (0, express_1.Router)();
router.get('/', (_req, res) => {
    res.json({ ok: true, route: 'ideas' });
});
router.post('/create', auth_1.requireAuth, (0, validate_1.validateBody)(idea_1.createIdeaSchema), async (req, res) => {
    try {
        const { content, fileId, sector } = req.body;
        const userId = req.user.userId;
        let rawText = content || '';
        if (fileId) {
            const file = await prisma_1.prisma.file.findFirst({ where: { id: fileId, userId } });
            if (!file) {
                return res.status(404).json({ error: 'File not found' });
            }
            rawText = await (0, processor_1.processMedia)(file.filepath, file.mimeType);
        }
        if (!rawText.trim()) {
            return res.status(422).json({ error: 'No content provided' });
        }
        const extracted = await (0, extractor_1.extractIdea)(rawText, sector);
        const idea = await prisma_1.prisma.idea.create({
            data: {
                userId,
                title: extracted.title,
                summary: extracted.elevator_pitch,
                rawContent: rawText,
                sector: extracted.sector || sector,
                status: 'DRAFT',
                files: fileId ? { connect: [{ id: fileId }] } : undefined,
            },
        });
        return res.json({
            ideaId: idea.id,
            extracted,
            nextStep: 'refine',
        });
    }
    catch (err) {
        if (err instanceof Error && err.message.startsWith('UNSUPPORTED_MEDIA:')) {
            return res.status(422).json({ error: err.message.replace('UNSUPPORTED_MEDIA:', '').trim() });
        }
        return res.status(500).json({ error: 'Failed to create idea' });
    }
});
exports.default = router;
