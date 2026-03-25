"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const supertest_1 = __importDefault(require("supertest"));
const vitest_1 = require("vitest");
const httpError_1 = require("../lib/httpError");
const config_1 = require("../config");
const jwt_1 = require("../lib/jwt");
const errors_1 = require("../middleware/errors");
const ideas_1 = __importDefault(require("./ideas"));
const { createIdeaFromInputMock } = vitest_1.vi.hoisted(() => ({
    createIdeaFromInputMock: vitest_1.vi.fn(),
}));
const { listIdeasForUserMock } = vitest_1.vi.hoisted(() => ({
    listIdeasForUserMock: vitest_1.vi.fn(),
}));
const { cleanupOrphanedUploadsMock } = vitest_1.vi.hoisted(() => ({
    cleanupOrphanedUploadsMock: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../services/ideas', () => ({
    createIdeaFromInput: createIdeaFromInputMock,
    listIdeasForUser: listIdeasForUserMock,
}));
vitest_1.vi.mock('../services/files/cleanupOrphanedUploads', () => ({
    cleanupOrphanedUploads: cleanupOrphanedUploadsMock,
}));
vitest_1.vi.mock('../middleware/rateLimit', () => ({
    ideasCreateRateLimit: (_req, _res, next) => next(),
}));
function signTestToken(userId) {
    return (0, jwt_1.signToken)(userId);
}
function buildApp() {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use((0, cookie_parser_1.default)());
    app.use('/api/ideas', ideas_1.default);
    app.use(errors_1.errorHandler);
    return app;
}
(0, vitest_1.describe)('POST /api/ideas', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.it)('retorna 401 en GET sin autenticacion', async () => {
        // Arrange
        const app = buildApp();
        // Act
        const response = await (0, supertest_1.default)(app).get('/api/ideas');
        // Assert
        (0, vitest_1.expect)(response.status).toBe(401);
        (0, vitest_1.expect)(response.body).toEqual({ error: 'Unauthorized', code: 'AUTH_UNAUTHORIZED' });
    });
    (0, vitest_1.it)('retorna ideas del usuario autenticado en GET', async () => {
        // Arrange
        const app = buildApp();
        const token = signTestToken('user-1');
        const createdAt = new Date('2026-01-05T00:00:00.000Z');
        listIdeasForUserMock.mockResolvedValue([
            {
                id: 'idea-1',
                title: 'Idea 1',
                summary: 'Resumen',
                sector: 'tech',
                status: 'DRAFT',
                isPublished: false,
                createdAt,
            },
        ]);
        // Act
        const response = await (0, supertest_1.default)(app).get('/api/ideas').set('Authorization', `Bearer ${token}`);
        // Assert
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(listIdeasForUserMock).toHaveBeenCalledWith('user-1');
        (0, vitest_1.expect)(response.body).toEqual({
            ideas: [
                {
                    id: 'idea-1',
                    title: 'Idea 1',
                    summary: 'Resumen',
                    sector: 'tech',
                    status: 'DRAFT',
                    isPublished: false,
                    createdAt: createdAt.toISOString(),
                },
            ],
        });
    });
    (0, vitest_1.it)('retorna 401 sin autenticacion', async () => {
        // Arrange
        const app = buildApp();
        // Act
        const response = await (0, supertest_1.default)(app).post('/api/ideas').send({ content: 'idea' });
        // Assert
        (0, vitest_1.expect)(response.status).toBe(401);
        (0, vitest_1.expect)(response.body).toEqual({ error: 'Unauthorized', code: 'AUTH_UNAUTHORIZED' });
    });
    (0, vitest_1.it)('retorna 401 con token invalido por issuer/audience', async () => {
        // Arrange
        const app = buildApp();
        const invalidToken = jsonwebtoken_1.default.sign({ userId: 'user-1' }, config_1.config.jwtSecret, {
            expiresIn: '7d',
            algorithm: 'HS256',
            issuer: 'otro-issuer',
            audience: config_1.config.jwtAudience,
        });
        // Act
        const response = await (0, supertest_1.default)(app)
            .post('/api/ideas')
            .set('Authorization', `Bearer ${invalidToken}`)
            .send({ content: 'idea valida' });
        // Assert
        (0, vitest_1.expect)(response.status).toBe(401);
        (0, vitest_1.expect)(response.body).toEqual({ error: 'Invalid token', code: 'AUTH_INVALID_TOKEN' });
    });
    (0, vitest_1.it)('retorna 422 con body invalido (sin contenido ni archivos)', async () => {
        // Arrange
        const app = buildApp();
        const token = signTestToken('user-1');
        // Act
        const response = await (0, supertest_1.default)(app)
            .post('/api/ideas')
            .set('Authorization', `Bearer ${token}`)
            .send({});
        // Assert
        (0, vitest_1.expect)(response.status).toBe(422);
        (0, vitest_1.expect)(response.body.error).toBe('Validation failed');
        (0, vitest_1.expect)(response.body.code).toBe('VALIDATION_ERROR');
    });
    (0, vitest_1.it)('retorna 201 en caso valido con dependencias mockeadas', async () => {
        // Arrange
        const app = buildApp();
        const token = signTestToken('user-1');
        createIdeaFromInputMock.mockResolvedValue({
            ideaId: 'idea-1',
            extracted: { title: 'Idea test' },
        });
        // Act
        const response = await (0, supertest_1.default)(app)
            .post('/api/ideas/create')
            .set('Authorization', `Bearer ${token}`)
            .send({ content: 'Una idea valida' });
        // Assert
        (0, vitest_1.expect)(response.status).toBe(201);
        (0, vitest_1.expect)(createIdeaFromInputMock).toHaveBeenCalledWith({
            userId: 'user-1',
            content: 'Una idea valida',
            fileId: undefined,
            fileIds: undefined,
            sector: undefined,
        });
        (0, vitest_1.expect)(response.body).toEqual({
            ideaId: 'idea-1',
            extracted: { title: 'Idea test' },
        });
    });
    (0, vitest_1.it)('intenta compensar adjuntos huérfanos cuando falla createIdea', async () => {
        // Arrange
        const app = buildApp();
        const token = signTestToken('user-1');
        createIdeaFromInputMock.mockRejectedValue(new httpError_1.HttpError(502, 'OpenRouter error', 'IDEAS_AI_PROVIDER_ERROR'));
        cleanupOrphanedUploadsMock.mockResolvedValue({
            attempted: 2,
            filesystemDeleted: 2,
            dbDeleted: 2,
            filesystemErrors: 0,
        });
        // Act
        const response = await (0, supertest_1.default)(app)
            .post('/api/ideas')
            .set('Authorization', `Bearer ${token}`)
            .send({
            content: 'Idea',
            fileId: 'file-1',
            fileIds: ['file-2', 'file-1'],
        });
        // Assert
        (0, vitest_1.expect)(response.status).toBe(502);
        (0, vitest_1.expect)(cleanupOrphanedUploadsMock).toHaveBeenCalledWith({
            userId: 'user-1',
            fileIds: ['file-2', 'file-1'],
        });
    });
    (0, vitest_1.it)('mantiene el error original aunque falle la compensacion', async () => {
        // Arrange
        const app = buildApp();
        const token = signTestToken('user-1');
        createIdeaFromInputMock.mockRejectedValue(new httpError_1.HttpError(422, 'No content provided', 'IDEAS_NO_CONTENT'));
        cleanupOrphanedUploadsMock.mockRejectedValue(new Error('fs error'));
        // Act
        const response = await (0, supertest_1.default)(app)
            .post('/api/ideas')
            .set('Authorization', `Bearer ${token}`)
            .send({
            fileIds: ['file-1'],
        });
        // Assert
        (0, vitest_1.expect)(response.status).toBe(422);
        (0, vitest_1.expect)(response.body).toEqual({ error: 'No content provided', code: 'IDEAS_NO_CONTENT' });
        (0, vitest_1.expect)(cleanupOrphanedUploadsMock).toHaveBeenCalledWith({
            userId: 'user-1',
            fileIds: ['file-1'],
        });
    });
});
