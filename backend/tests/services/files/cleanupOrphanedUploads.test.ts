import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanupOrphanedUploads } from '../../../src/services/files/cleanupOrphanedUploads'

const { unlinkMock } = vi.hoisted(() => ({
  unlinkMock: vi.fn(),
}))

const { prismaFileFindManyMock, prismaFileDeleteManyMock } = vi.hoisted(() => ({
  prismaFileFindManyMock: vi.fn(),
  prismaFileDeleteManyMock: vi.fn(),
}))

vi.mock('fs/promises', () => ({
  default: {
    unlink: unlinkMock,
  },
}))

vi.mock('../../../src/lib/prisma', () => ({
  prisma: {
    file: {
      findMany: prismaFileFindManyMock,
      deleteMany: prismaFileDeleteManyMock,
    },
  },
}))

describe('cleanupOrphanedUploads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('borra archivos en filesystem y DB cuando estan huerfanos', async () => {
    prismaFileFindManyMock.mockResolvedValue([
      { id: 'file-1', filepath: '/tmp/a.txt' },
      { id: 'file-2', filepath: '/tmp/b.txt' },
    ])
    unlinkMock.mockResolvedValue(undefined)
    prismaFileDeleteManyMock.mockResolvedValue({ count: 2 })

    const result = await cleanupOrphanedUploads({
      userId: 'user-1',
      fileIds: ['file-1', 'file-2'],
    })

    expect(prismaFileFindManyMock).toHaveBeenCalledWith({
      where: {
        id: { in: ['file-1', 'file-2'] },
        userId: 'user-1',
        ideaId: null,
      },
      select: { id: true, filepath: true },
    })
    expect(unlinkMock).toHaveBeenCalledTimes(2)
    expect(prismaFileDeleteManyMock).toHaveBeenCalledWith({
      where: {
        id: { in: ['file-1', 'file-2'] },
        userId: 'user-1',
        ideaId: null,
      },
    })
    expect(result).toEqual({
      attempted: 2,
      filesystemDeleted: 2,
      dbDeleted: 2,
      filesystemErrors: 0,
    })
  })

  it('elimina en DB si el archivo ya no existe en disco (ENOENT)', async () => {
    prismaFileFindManyMock.mockResolvedValue([{ id: 'file-1', filepath: '/tmp/a.txt' }])
    unlinkMock.mockRejectedValue({ code: 'ENOENT' })
    prismaFileDeleteManyMock.mockResolvedValue({ count: 1 })

    const result = await cleanupOrphanedUploads({
      userId: 'user-1',
      fileIds: ['file-1'],
    })

    expect(result).toEqual({
      attempted: 1,
      filesystemDeleted: 0,
      dbDeleted: 1,
      filesystemErrors: 0,
    })
  })

  it('tolera errores parciales de filesystem y no borra esos registros en DB', async () => {
    prismaFileFindManyMock.mockResolvedValue([
      { id: 'file-1', filepath: '/tmp/a.txt' },
      { id: 'file-2', filepath: '/tmp/b.txt' },
    ])
    unlinkMock.mockRejectedValueOnce({ code: 'EACCES' }).mockResolvedValueOnce(undefined)
    prismaFileDeleteManyMock.mockResolvedValue({ count: 1 })

    const result = await cleanupOrphanedUploads({
      userId: 'user-1',
      fileIds: ['file-1', 'file-2'],
    })

    expect(prismaFileDeleteManyMock).toHaveBeenCalledWith({
      where: {
        id: { in: ['file-2'] },
        userId: 'user-1',
        ideaId: null,
      },
    })
    expect(result).toEqual({
      attempted: 2,
      filesystemDeleted: 1,
      dbDeleted: 1,
      filesystemErrors: 1,
    })
  })
})
