"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupOrphanedUploads = cleanupOrphanedUploads;
const promises_1 = __importDefault(require("fs/promises"));
const prisma_1 = require("../../lib/prisma");
async function cleanupOrphanedUploads(input) {
    const uniqueIds = [...new Set(input.fileIds)];
    if (uniqueIds.length === 0) {
        return {
            attempted: 0,
            filesystemDeleted: 0,
            dbDeleted: 0,
            filesystemErrors: 0,
        };
    }
    const files = await prisma_1.prisma.file.findMany({
        where: {
            id: { in: uniqueIds },
            userId: input.userId,
            ideaId: null,
        },
        select: {
            id: true,
            filepath: true,
        },
    });
    const removableIds = [];
    let filesystemDeleted = 0;
    let filesystemErrors = 0;
    for (const file of files) {
        try {
            await promises_1.default.unlink(file.filepath);
            removableIds.push(file.id);
            filesystemDeleted += 1;
        }
        catch (err) {
            const code = err.code;
            if (code === 'ENOENT') {
                removableIds.push(file.id);
                continue;
            }
            filesystemErrors += 1;
        }
    }
    const { count: dbDeleted } = removableIds.length > 0
        ? await prisma_1.prisma.file.deleteMany({
            where: {
                id: { in: removableIds },
                userId: input.userId,
                ideaId: null,
            },
        })
        : { count: 0 };
    return {
        attempted: files.length,
        filesystemDeleted,
        dbDeleted,
        filesystemErrors,
    };
}
