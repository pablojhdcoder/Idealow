import { cn } from '@/lib/utils'

/** Logo de marca en `public/logo2.png`. */
export const APP_LOGO_SRC = '/logo2.png' as const

const sizeClass = {
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-14',
} as const

type AppLogoProps = {
  className?: string
  size?: keyof typeof sizeClass
  /** Si ya hay el nombre "Idealow" visible junto al logo (evita duplicar en lectores de pantalla). */
  decorative?: boolean
  /** Sube el icono un poco para alinearlo visualmente con el texto serif junto al que va. */
  alignWithWordmark?: boolean
}

export function AppLogo({
  className,
  size = 'md',
  decorative = false,
  alignWithWordmark = false,
}: AppLogoProps) {
  return (
    <img
      src={APP_LOGO_SRC}
      alt={decorative ? '' : 'Idealow'}
      aria-hidden={decorative ? true : undefined}
      className={cn(
        'w-auto max-w-[min(100%,280px)] object-contain object-left',
        sizeClass[size],
        alignWithWordmark && '-translate-y-[3px]',
        className,
      )}
    />
  )
}
