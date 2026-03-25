"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = void 0;
const logger_1 = require("../lib/logger");
const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const durationMs = Date.now() - start;
        logger_1.logger.info({
            method: req.method,
            path: req.originalUrl,
            status: res.statusCode,
            durationMs,
            userId: req.user?.userId ?? null,
        }, 'request completed');
    });
    next();
};
exports.requestLogger = requestLogger;
