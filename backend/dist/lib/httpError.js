"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpError = void 0;
/**
 * Errores HTTP explícitos para mapear en rutas o en el errorHandler global.
 */
class HttpError extends Error {
    constructor(statusCode, message, code, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.name = 'HttpError';
    }
}
exports.HttpError = HttpError;
