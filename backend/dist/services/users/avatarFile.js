"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAvatarFileIdFromUrl = parseAvatarFileIdFromUrl;
exports.deleteOwnedAvatarFile = deleteOwnedAvatarFile;
const fs_1 = __importDefault(require("fs"));
const prisma_1 = require("../../lib/prisma");
const AVATAR_FILE_PATH = /^\/api\/files\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
function parseAvatarFileIdFromUrl(avatarUrl) {
    if (!avatarUrl)
        return null;
    const m = AVATAR_FILE_PATH.exec(avatarUrl.trim());
    return m ? m[1] : null;
}
/**
 * Borra del disco y de Prisma un fichero subido previamente como avatar (`/api/files/:id`),
 * solo si pertenece al usuario. No borra URLs externas.
 */
async function deleteOwnedAvatarFile(userId, previousAvatarUrl) {
    const fileId = parseAvatarFileIdFromUrl(previousAvatarUrl ?? null);
    if (!fileId)
        return;
    const row = await prisma_1.prisma.file.findFirst({
        where: { id: fileId, userId },
    });
    if (!row)
        return;
    try {
        if (fs_1.default.existsSync(row.filepath)) {
            fs_1.default.unlinkSync(row.filepath);
        }
    }
    catch {
        // ignorar fallos de borrado en disco
    }
    try {
        await prisma_1.prisma.file.delete({ where: { id: fileId } });
    }
    catch {
        // ya borrado o conflicto
    }
}
