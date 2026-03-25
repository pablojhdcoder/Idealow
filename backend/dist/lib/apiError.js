"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendError = void 0;
const sendError = (res, status, error, code, details) => {
    const payload = { error, code };
    if (details !== undefined) {
        payload.details = details;
    }
    return res.status(status).json(payload);
};
exports.sendError = sendError;
