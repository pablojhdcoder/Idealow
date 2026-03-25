"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const cleanupOrphanedUploads_1 = require("./cleanupOrphanedUploads");
const { unlinkMock } = vitest_1.vi.hoisted(() => ({
    unlinkMock: vitest_1.vi.fn(),
}));
const { prismaFileFindManyMock, prismaFileDeleteManyMock } = vitest_1.vi.hoisted(() => ({
    prismaFileFindManyMock: vitest_1.vi.fn(),
    prismaFileDeleteManyMock: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('fs/promises', () => ({
    default: {
        unlink: unlinkMock,
    },
}));
vitest_1.vi.mock('../../lib/prisma', () => ({
    prisma: {
        file: {
            findMany: prismaFileFindManyMock,
            deleteMany: prismaFileDeleteManyMock,
        },
    },
}));
(0, vitest_1.describe)('cleanupOrphanedUploads', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.it)('borra archivos en filesystem y DB cuando están huérfanos', async () => {
        prismaFileFindManyMock.mockResolvedValue([
            { id: 'file-1', filepath: '/tmp/a.txt' },
            { id: 'file-2', filepath: '/tmp/b.txt' },
        ]);
        unlinkMock.mockResolvedValue(undefined);
        prismaFileDeleteManyMock.mockResolvedValue({ count: 2 });
        const result = await (0, cleanupOrphanedUploads_1.cleanupOrphanedUploads)({
            userId: 'user-1',
            fileIds: ['file-1', 'file-2'],
        });
        (0, vitest_1.expect)(prismaFileFindManyMock).toHaveBeenCalledWith({
            where: {
                id: { in: ['file-1', 'file-2'] },
                userId: 'user-1',
                ideaId: null,
            },
            select: { id: true, filepath: true },
        });
        (0, vitest_1.expect)(unlinkMock).toHaveBeenCalledTimes(2);
        (0, vitest_1.expect)(prismaFileDeleteManyMock).toHaveBeenCalledWith({
            where: {
                id: { in: ['file-1', 'file-2'] },
                userId: 'user-1',
                ideaId: null,
            },
        });
        (0, vitest_1.expect)(result).toEqual({
            attempted: 2,
            filesystemDeleted: 2,
            dbDeleted: 2,
            filesystemErrors: 0,
        });
    });
    (0, vitest_1.it)('elimina en DB si el archivo ya no existe en disco (ENOENT)', async () => {
        prismaFileFindManyMock.mockResolvedValue([{ id: 'file-1', filepath: '/tmp/a.txt' }]);
        unlinkMock.mockRejectedValue({ code: 'ENOENT' });
        prismaFileDeleteManyMock.mockResolvedValue({ count: 1 });
        const result = await (0, cleanupOrphanedUploads_1.cleanupOrphanedUploads)({
            userId: 'user-1',
            fileIds: ['file-1'],
        });
        (0, vitest_1.expect)(result).toEqual({
            attempted: 1,
            filesystemDeleted: 0,
            dbDeleted: 1,
            filesystemErrors: 0,
        });
    });
    (0, vitest_1.it)('tolera errores parciales de filesystem y no borra esos registros en DB', async () => {
        prismaFileFindManyMock.mockResolvedValue([
            { id: 'file-1', filepath: '/tmp/a.txt' },
            { id: 'file-2', filepath: '/tmp/b.txt' },
        ]);
        unlinkMock
            .mockRejectedValueOnce({ code: 'EACCES' })
            .mockResolvedValueOnce(undefined);
        prismaFileDeleteManyMock.mockResolvedValue({ count: 1 });
        const result = await (0, cleanupOrphanedUploads_1.cleanupOrphanedUploads)({
            userId: 'user-1',
            fileIds: ['file-1', 'file-2'],
        });
        (0, vitest_1.expect)(prismaFileDeleteManyMock).toHaveBeenCalledWith({
            where: {
                id: { in: ['file-2'] },
                userId: 'user-1',
                ideaId: null,
            },
        });
        (0, vitest_1.expect)(result).toEqual({
            attempted: 2,
            filesystemDeleted: 1,
            dbDeleted: 1,
            filesystemErrors: 1,
        });
    });
});
