"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const config_1 = require("../config");
const errorHandler = (err, _req, res, _next) => {
    const message = err instanceof Error ? err.message : 'Internal server error';
    const payload = config_1.config.nodeEnv === 'development'
        ? { error: message, details: err }
        : { error: 'Internal server error' };
    res.status(500).json(payload);
};
exports.errorHandler = errorHandler;
