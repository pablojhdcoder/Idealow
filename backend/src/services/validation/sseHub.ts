import type { Response } from 'express'

const clients = new Map<string, Response[]>()

export function registerValidationSseClient(ideaId: string, res: Response): void {
  const list = clients.get(ideaId) ?? []
  list.push(res)
  clients.set(ideaId, list)
}

export function unregisterValidationSseClient(ideaId: string, res: Response): void {
  const list = (clients.get(ideaId) ?? []).filter(c => c !== res)
  if (list.length === 0) {
    clients.delete(ideaId)
  } else {
    clients.set(ideaId, list)
  }
}

export function emitValidationSse(ideaId: string, data: object): void {
  const line = `data: ${JSON.stringify(data)}\n\n`
  for (const res of clients.get(ideaId) ?? []) {
    try {
      res.write(line)
    } catch {
      // cliente desconectado; se limpia en close
    }
  }
}
