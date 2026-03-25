"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const apiError_1 = require("../lib/apiError");
const jwt_1 = require("../lib/jwt");
const requireAuth = (req, res, next) => {
    const request = req;
    const bearer = req.headers.authorization?.split(' ')[1];
    const token = req.cookies?.token || bearer;
    if (!token) {
        return (0, apiError_1.sendError)(res, 401, 'Unauthorized', 'AUTH_UNAUTHORIZED');
    }
    try {
        request.user = (0, jwt_1.verifyToken)(token);
        next();
    }
    catch {
        return (0, apiError_1.sendError)(res, 401, 'Invalid token', 'AUTH_INVALID_TOKEN');
    }
};
exports.requireAuth = requireAuth;
