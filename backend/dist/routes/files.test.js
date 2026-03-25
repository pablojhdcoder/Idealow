"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const supertest_1 = __importDefault(require("supertest"));
const vitest_1 = require("vitest");
const errors_1 = require("../middleware/errors");
const files_1 = __importDefault(require("./files"));
const { prismaCreateMock } = vitest_1.vi.hoisted(() => ({
    prismaCreateMock: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../lib/prisma', () => ({
    prisma: {
        file: {
            create: prismaCreateMock,
        },
    },
}));
vitest_1.vi.mock('../middleware/rateLimit', () => ({
    filesUploadRateLimit: (_req, _res, next) => next(),
}));
const TEST_JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret';
process.env.JWT_SECRET = TEST_JWT_SECRET;
process.env.UPLOAD_DIR = process.env.UPLOAD_DIR ?? path_1.default.join(os_1.default.tmpdir(), 'idealow2-tests-uploads');
function signTestToken(userId) {
    return jsonwebtoken_1.default.sign({ userId }, TEST_JWT_SECRET);
}
function buildApp() {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use((0, cookie_parser_1.default)());
    app.use('/api/files', files_1.default);
    app.use(errors_1.errorHandler);
    return app;
}
(0, vitest_1.describe)('POST /api/files/upload', () => {
    (0, vitest_1.it)('retorna 401 sin autenticacion', async () => {
        // Arrange
        const app = buildApp();
        // Act
        const response = await (0, supertest_1.default)(app).post('/api/files/upload');
        // Assert
        (0, vitest_1.expect)(response.status).toBe(401);
        (0, vitest_1.expect)(response.body).toEqual({ error: 'Unauthorized' });
    });
    (0, vitest_1.it)('rechaza tipo no soportado', async () => {
        // Arrange
        const app = buildApp();
        const token = signTestToken('user-1');
        // Act
        const response = await (0, supertest_1.default)(app)
            .post('/api/files/upload')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', Buffer.from('contenido'), {
            filename: 'archivo.bin',
            contentType: 'application/octet-stream',
        });
        // Assert
        (0, vitest_1.expect)(response.status).toBe(422);
        (0, vitest_1.expect)(response.body).toEqual({ error: 'Unsupported file type' });
        (0, vitest_1.expect)(prismaCreateMock).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('retorna exito sin exponer filepath', async () => {
        // Arrange
        const app = buildApp();
        const token = signTestToken('user-1');
        const createdAt = new Date('2026-01-01T00:00:00.000Z');
        prismaCreateMock.mockResolvedValue({
            id: 'file-1',
            userId: 'user-1',
            filepath: '/tmp/secret/path.txt',
            originalName: 'nota.txt',
            mimeType: 'text/plain',
            sizeBytes: 11,
            createdAt,
        });
        // Act
        const response = await (0, supertest_1.default)(app)
            .post('/api/files/upload')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', Buffer.from('hola mundo'), {
            filename: 'nota.txt',
            contentType: 'text/plain',
        });
        // Assert
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(response.body.fileId).toBe('file-1');
        (0, vitest_1.expect)(response.body.file).toEqual({
            id: 'file-1',
            userId: 'user-1',
            originalName: 'nota.txt',
            mimeType: 'text/plain',
            sizeBytes: 11,
            createdAt: createdAt.toISOString(),
        });
        (0, vitest_1.expect)(response.body.file.filepath).toBeUndefined();
    });
});
