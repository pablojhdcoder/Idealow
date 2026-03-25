"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const httpError_1 = require("../../lib/httpError");
const createIdea_1 = require("./createIdea");
const { prismaFileFindFirstMock, prismaIdeaCreateMock } = vitest_1.vi.hoisted(() => ({
    prismaFileFindFirstMock: vitest_1.vi.fn(),
    prismaIdeaCreateMock: vitest_1.vi.fn(),
}));
const { extractIdeaMock } = vitest_1.vi.hoisted(() => ({
    extractIdeaMock: vitest_1.vi.fn(),
}));
const { processMediaMock } = vitest_1.vi.hoisted(() => ({
    processMediaMock: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../../lib/prisma', () => ({
    prisma: {
        file: {
            findFirst: prismaFileFindFirstMock,
        },
        idea: {
            create: prismaIdeaCreateMock,
        },
    },
}));
vitest_1.vi.mock('../ai/extractor', () => ({
    extractIdea: extractIdeaMock,
}));
vitest_1.vi.mock('../media/processor', () => ({
    processMedia: processMediaMock,
}));
(0, vitest_1.describe)('createIdeaFromInput', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.it)('combina contenido y archivos del usuario y persiste idea', async () => {
        // Arrange
        prismaFileFindFirstMock.mockResolvedValue({
            id: '00000000-0000-4000-8000-000000000001',
            userId: 'user-1',
            filepath: '/tmp/file.txt',
            mimeType: 'text/plain',
        });
        processMediaMock.mockResolvedValue('texto desde archivo');
        extractIdeaMock.mockResolvedValue({
            title: 'Idea final',
            problem: 'Problema',
            solution: 'Solucion',
            target_audience: 'Audiencia',
            sector: 'tech',
            elevator_pitch: 'Pitch',
            confidence: 0.9,
            search_keywords: ['idea'],
        });
        prismaIdeaCreateMock.mockResolvedValue({ id: 'idea-1' });
        // Act
        const result = await (0, createIdea_1.createIdeaFromInput)({
            userId: 'user-1',
            content: '  texto manual  ',
            fileIds: ['00000000-0000-4000-8000-000000000001'],
            sector: 'tech',
        });
        // Assert
        (0, vitest_1.expect)(prismaFileFindFirstMock).toHaveBeenCalledWith({
            where: { id: '00000000-0000-4000-8000-000000000001', userId: 'user-1' },
        });
        (0, vitest_1.expect)(processMediaMock).toHaveBeenCalledWith('/tmp/file.txt', 'text/plain');
        (0, vitest_1.expect)(extractIdeaMock).toHaveBeenCalledWith('texto manual\n\ntexto desde archivo', 'tech');
        (0, vitest_1.expect)(prismaIdeaCreateMock).toHaveBeenCalledWith({
            data: vitest_1.expect.objectContaining({
                userId: 'user-1',
                title: 'Idea final',
                rawContent: 'texto manual\n\ntexto desde archivo',
            }),
        });
        (0, vitest_1.expect)(result).toEqual({
            ideaId: 'idea-1',
            extracted: vitest_1.expect.objectContaining({ title: 'Idea final' }),
            nextStep: 'refine',
        });
    });
    (0, vitest_1.it)('retorna 404 cuando un archivo no pertenece al usuario', async () => {
        // Arrange
        prismaFileFindFirstMock.mockResolvedValue(null);
        // Act
        const action = (0, createIdea_1.createIdeaFromInput)({
            userId: 'user-1',
            fileIds: ['00000000-0000-4000-8000-000000000999'],
        });
        // Assert
        await (0, vitest_1.expect)(action).rejects.toBeInstanceOf(httpError_1.HttpError);
        await (0, vitest_1.expect)(action).rejects.toMatchObject({ statusCode: 404, message: 'File not found' });
    });
    (0, vitest_1.it)('mapea errores de media no soportada a 422', async () => {
        // Arrange
        prismaFileFindFirstMock.mockResolvedValue({
            id: '00000000-0000-4000-8000-000000000001',
            userId: 'user-1',
            filepath: '/tmp/file.pdf',
            mimeType: 'application/pdf',
        });
        processMediaMock.mockRejectedValue(new Error('UNSUPPORTED_MEDIA: PDF extraction is not implemented yet'));
        // Act
        const action = (0, createIdea_1.createIdeaFromInput)({
            userId: 'user-1',
            fileIds: ['00000000-0000-4000-8000-000000000001'],
        });
        // Assert
        await (0, vitest_1.expect)(action).rejects.toBeInstanceOf(httpError_1.HttpError);
        await (0, vitest_1.expect)(action).rejects.toMatchObject({
            statusCode: 422,
            message: 'PDF extraction is not implemented yet',
        });
    });
    (0, vitest_1.it)('retorna 422 cuando no hay contenido util', async () => {
        // Arrange
        // sin contenido y sin archivos validos
        // Act
        const action = (0, createIdea_1.createIdeaFromInput)({
            userId: 'user-1',
            content: '   ',
        });
        // Assert
        await (0, vitest_1.expect)(action).rejects.toBeInstanceOf(httpError_1.HttpError);
        await (0, vitest_1.expect)(action).rejects.toMatchObject({ statusCode: 422, message: 'No content provided' });
    });
});
