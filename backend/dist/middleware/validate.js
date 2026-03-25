"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateParams = exports.validateBody = void 0;
const apiError_1 = require("../lib/apiError");
const validateBody = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        return (0, apiError_1.sendError)(res, 422, 'Validation failed', 'VALIDATION_ERROR', result.error.flatten());
    }
    req.body = result.data;
    next();
};
exports.validateBody = validateBody;
const validateParams = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
        return (0, apiError_1.sendError)(res, 422, 'Validation failed', 'VALIDATION_ERROR', result.error.flatten());
    }
    req.params = result.data;
    next();
};
exports.validateParams = validateParams;
