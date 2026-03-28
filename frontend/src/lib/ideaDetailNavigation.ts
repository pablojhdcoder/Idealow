/** Estado opcional al abrir la ficha (`/ideas/:id`) para volver a la pantalla de origen. */
export type IdeaDetailLocationState = {
  from?: string
}

export function safeReturnPath(state: unknown): string {
  if (state && typeof state === 'object' && 'from' in state) {
    const raw = (state as IdeaDetailLocationState).from
    if (typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//')) {
      return raw
    }
  }
  return '/ideas'
}

export function backLabelForPath(path: string): string {
  if (path === '/dashboard') return 'Dashboard'
  if (path === '/ideas') return 'Mis ideas'
  if (path === '/feed') return 'Comunidad'
  return 'Volver'
}
