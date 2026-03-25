"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const vitest_1 = require("vitest");
const config_1 = require("../config");
const jwt_1 = require("./jwt");
(0, vitest_1.describe)('JWT hardening', () => {
    (0, vitest_1.it)('firma y verifica con issuer/audience/algoritmo esperados', () => {
        // Arrange
        const token = (0, jwt_1.signToken)('user-123');
        // Act
        const decoded = jsonwebtoken_1.default.decode(token, { complete: true });
        const payload = (0, jwt_1.verifyToken)(token);
        // Assert
        (0, vitest_1.expect)(decoded.header?.alg).toBe('HS256');
        (0, vitest_1.expect)(decoded.payload?.iss).toBe(config_1.config.jwtIssuer);
        (0, vitest_1.expect)(decoded.payload?.aud).toBe(config_1.config.jwtAudience);
        (0, vitest_1.expect)(payload).toEqual({ userId: 'user-123' });
    });
    (0, vitest_1.it)('rechaza token con audience invalido', () => {
        // Arrange
        const token = jsonwebtoken_1.default.sign({ userId: 'user-123' }, config_1.config.jwtSecret, {
            expiresIn: '7d',
            algorithm: 'HS256',
            issuer: config_1.config.jwtIssuer,
            audience: 'otro-audience',
        });
        // Act + Assert
        (0, vitest_1.expect)(() => (0, jwt_1.verifyToken)(token)).toThrow();
    });
});
