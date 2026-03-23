"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const jwt_1 = require("../lib/jwt");
const requireAuth = (req, res, next) => {
    const request = req;
    const bearer = req.headers.authorization?.split(' ')[1];
    const token = req.cookies?.token || bearer;
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        request.user = (0, jwt_1.verifyToken)(token);
        next();
    }
    catch {
        return res.status(401).json({ error: 'Invalid token' });
    }
};
exports.requireAuth = requireAuth;
