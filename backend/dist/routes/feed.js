"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
router.get('/', (_req, res) => {
    res.json({
        items: [],
        nextCursor: null,
        _meta: {
            phase: 'stub',
            message: 'Feed comunitario pendiente de implementación (roadmap: flashcards + votos).',
        },
    });
});
exports.default = router;
