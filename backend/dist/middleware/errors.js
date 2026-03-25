"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const config_1 = require("../config");
const apiError_1 = require("../lib/apiError");
const httpError_1 = require("../lib/httpError");
const logger_1 = require("../lib/logger");
const errorHandler = (err, req, res, _next) => {
    if (err instanceof httpError_1.HttpError) {
        logger_1.logger.warn({
            statusCode: err.statusCode,
            path: req.originalUrl,
            method: req.method,
            userId: req.user?.userId ?? null,
            code: err.code,
            details: err.details,
        }, err.message);
        return (0, apiError_1.sendError)(res, err.statusCode, err.message, err.code, err.details);
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger_1.logger.error({
        err,
        path: req.originalUrl,
        method: req.method,
        userId: req.user?.userId ?? null,
    }, 'Unhandled error');
    return (0, apiError_1.sendError)(res, 500, config_1.config.nodeEnv === 'development' ? message : 'Internal server error', 'INTERNAL_SERVER_ERROR', config_1.config.nodeEnv === 'development'
        ? err instanceof Error
            ? { name: err.name, message: err.message, stack: err.stack }
            : err
        : undefined);
};
exports.errorHandler = errorHandler;
