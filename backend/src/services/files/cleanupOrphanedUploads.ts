import fs from 'fs/promises'
import { prisma } from '../../lib/prisma'

type CleanupOrphanedUploadsInput = {
  userId: string
  fileIds: string[]
}

type CleanupOrphanedUploadsResult = {
  attempted: number
  filesystemDeleted: number
  dbDeleted: number
  filesystemErrors: number
}

export async function cleanupOrphanedUploads(
  input: CleanupOrphanedUploadsInput,
): Promise<CleanupOrphanedUploadsResult> {
  const uniqueIds = [...new Set(input.fileIds)]
  if (uniqueIds.length === 0) {
    return {
      attempted: 0,
      filesystemDeleted: 0,
      dbDeleted: 0,
      filesystemErrors: 0,
    }
  }

  const files = await prisma.file.findMany({
    where: {
      id: { in: uniqueIds },
      userId: input.userId,
      ideaId: null,
    },
    select: {
      id: true,
      filepath: true,
    },
  })

  const removableIds: string[] = []
  let filesystemDeleted = 0
  let filesystemErrors = 0

  for (const file of files) {
    try {
      await fs.unlink(file.filepath)
      removableIds.push(file.id)
      filesystemDeleted += 1
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code
      if (code === 'ENOENT') {
        removableIds.push(file.id)
        continue
      }
      filesystemErrors += 1
    }
  }

  const { count: dbDeleted } =
    removableIds.length > 0
      ? await prisma.file.deleteMany({
          where: {
            id: { in: removableIds },
            userId: input.userId,
            ideaId: null,
          },
        })
      : { count: 0 }

  return {
    attempted: files.length,
    filesystemDeleted,
    dbDeleted,
    filesystemErrors,
  }
}
