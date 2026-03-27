import fs from 'fs'
import { prisma } from '../../lib/prisma'

const AVATAR_FILE_PATH = /^\/api\/files\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i

export function parseAvatarFileIdFromUrl(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl) return null
  const m = AVATAR_FILE_PATH.exec(avatarUrl.trim())
  return m ? m[1] : null
}

/**
 * Borra del disco y de Prisma un fichero subido previamente como avatar (`/api/files/:id`),
 * solo si pertenece al usuario. No borra URLs externas.
 */
export async function deleteOwnedAvatarFile(
  userId: string,
  previousAvatarUrl: string | null | undefined,
): Promise<void> {
  const fileId = parseAvatarFileIdFromUrl(previousAvatarUrl ?? null)
  if (!fileId) return

  const row = await prisma.file.findFirst({
    where: { id: fileId, userId },
  })
  if (!row) return

  try {
    if (fs.existsSync(row.filepath)) {
      fs.unlinkSync(row.filepath)
    }
  } catch {
    // ignorar fallos de borrado en disco
  }

  try {
    await prisma.file.delete({ where: { id: fileId } })
  } catch {
    // ya borrado o conflicto
  }
}
