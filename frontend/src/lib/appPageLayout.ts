import { cn } from '@/lib/utils'

/** Ancho máximo de columna de contenido (mismo que `AppShellHeader` y páginas con shell). */
export const APP_PAGE_MAX_WIDTH_CLASS = 'max-w-5xl'

/** Centrado al ancho de app sin padding horizontal (p. ej. dentro de una sección que ya tiene `px-4`). */
export const APP_PAGE_WIDTH_CLASS = cn('mx-auto w-full', APP_PAGE_MAX_WIDTH_CLASS)

/**
 * Contenedor principal de páginas con AppShell (y marketing donde aplique la misma retícula).
 * `className` opcional para padding vertical u otras utilidades.
 */
export function appPageMainClassName(...extras: (string | undefined | false)[]): string {
  return cn('mx-auto w-full max-w-5xl px-4 sm:px-6', ...extras)
}
