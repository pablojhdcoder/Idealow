"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const vitest_1 = require("vitest");
const httpError_1 = require("../lib/httpError");
const errors_1 = require("./errors");
function buildAppForError(err) {
    const app = (0, express_1.default)();
    app.get('/boom', (_req, _res, next) => next(err));
    app.use(errors_1.errorHandler);
    return app;
}
(0, vitest_1.describe)('errorHandler envelope', () => {
    (0, vitest_1.it)('serializa HttpError con code y details', async () => {
        // Arrange
        const app = buildAppForError(new httpError_1.HttpError(422, 'Validation failed', 'VALIDATION_ERROR', { fieldErrors: { email: ['required'] } }));
        // Act
        const response = await (0, supertest_1.default)(app).get('/boom');
        // Assert
        (0, vitest_1.expect)(response.status).toBe(422);
        (0, vitest_1.expect)(response.body).toEqual({
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: { fieldErrors: { email: ['required'] } },
        });
    });
});
