import { useEffect, useMemo, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { faviconUrlFromHref } from '@/lib/faviconUrl'
import { cn } from '@/lib/utils'

export type ValidationReferenceCardProps = {
  href: string
  title: string
  subtitle?: string
  imageUrl?: string
  className?: string
}

export function ValidationReferenceCard({
  href,
  title,
  subtitle,
  imageUrl,
  className,
}: ValidationReferenceCardProps) {
  const faviconSrc = useMemo(() => faviconUrlFromHref(href), [href])
  /** primary = miniatura (p. ej. YouTube); favicon = logo del sitio; fallback = icono genérico */
  const [visual, setVisual] = useState<'primary' | 'favicon' | 'fallback'>(
    imageUrl ? 'primary' : faviconSrc ? 'favicon' : 'fallback',
  )

  useEffect(() => {
    setVisual(imageUrl ? 'primary' : faviconSrc ? 'favicon' : 'fallback')
  }, [href, imageUrl, faviconSrc])

  const label =
    subtitle != null && subtitle.trim() !== ''
      ? `${title}. ${subtitle}. Abrir enlace en nueva pestaña`
      : `${title}. Abrir enlace en nueva pestaña`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={cn(
        'group flex gap-3 rounded-2xl border border-border bg-card/80 p-3 shadow-sm transition',
        'hover:border-primary/30 hover:bg-muted/40 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className,
      )}
    >
      <div
        className="flex size-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/50 bg-muted/30"
        aria-hidden
      >
        {visual === 'primary' && imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="size-full object-cover"
            loading="lazy"
            onError={() => setVisual(faviconSrc ? 'favicon' : 'fallback')}
          />
        ) : null}
        {visual === 'favicon' && faviconSrc ? (
          <img
            src={faviconSrc}
            alt=""
            className="size-9 object-contain"
            loading="lazy"
            onError={() => setVisual('fallback')}
          />
        ) : null}
        {visual === 'fallback' ? (
          <ExternalLink className="size-5 text-primary opacity-70" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <p className="text-sm font-medium leading-snug text-foreground line-clamp-2">{title}</p>
        {subtitle ? (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-3">{subtitle}</p>
        ) : null}
        <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
          <ExternalLink className="size-3 opacity-80 transition group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </a>
  )
}
