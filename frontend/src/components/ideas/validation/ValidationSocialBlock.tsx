import type { ComponentType } from 'react'
import { FaInstagram, FaTiktok, FaXTwitter, FaYoutube } from 'react-icons/fa6'
import type { SourceStatus } from '@/hooks/useValidationStream'
import { ValidationReferenceCard } from '@/components/ideas/validation/ValidationReferenceCard'
import { cn } from '@/lib/utils'

const AI_ORDER = ['x', 'instagram', 'tiktok'] as const

type SectionIcon = ComponentType<{ className?: string }>

const AI_SECTION_META: Record<
  (typeof AI_ORDER)[number],
  { title: string; Icon: SectionIcon; iconClass: string }
> = {
  x: {
    title: 'X',
    Icon: FaXTwitter,
    iconClass: 'text-foreground',
  },
  instagram: {
    title: 'Instagram',
    Icon: FaInstagram,
    iconClass: 'text-pink-600',
  },
  tiktok: {
    title: 'TikTok',
    Icon: FaTiktok,
    iconClass: 'text-cyan-600',
  },
}

type AiKey = (typeof AI_ORDER)[number]

const SEARCH_LINK_LABEL: Record<AiKey, string> = {
  x: 'X',
  instagram: 'Instagram',
  tiktok: 'TikTok',
}

function SectionHeading({
  Icon,
  title,
  iconClass,
}: {
  Icon: SectionIcon
  title: string
  iconClass: string
}) {
  return (
    <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      <Icon className={cn('size-3.5 shrink-0', iconClass)} aria-hidden />
      {title}
    </p>
  )
}

function socialSearchUrl(platform: AiKey | 'youtube', q: string): string {
  const enc = encodeURIComponent(q)
  switch (platform) {
    case 'youtube':
      return `https://www.youtube.com/results?search_query=${enc}`
    case 'x':
      return `https://x.com/search?q=${enc}&src=typed_query`
    case 'instagram':
      return `https://www.instagram.com/explore/tags/${encodeURIComponent(q.split(/\s+/)[0] || q)}/`
    case 'tiktok':
      return `https://www.tiktok.com/search?q=${enc}`
    default:
      return `https://www.google.com/search?q=${enc}`
  }
}

export function ValidationSocialBlock({ s }: { s: SourceStatus }) {
  const ai = s.aiSocialSearch
  const q = s.exploreQuery?.trim() ?? ''
  const long = s.youtubeLongSamples ?? []
  const short = s.youtubeShortSamples ?? []
  const longTotal = Math.max(long.length, s.youtubeLongCount ?? 0)
  const shortTotal = Math.max(short.length, s.youtubeShortsCount ?? 0)
  const hasVideoCards = long.length > 0 || short.length > 0
  const apiReportedVideos = longTotal + shortTotal > 0

  if (s.status !== 'done') return null

  return (
    <div className="mt-5 space-y-10 border-t border-border/70 pt-5">
      <div>
        <SectionHeading Icon={FaYoutube} title="YouTube (Data API v3)" iconClass="text-[#FF0000]" />
        <div
          className={cn(
            'rounded-2xl border border-border/80 bg-gradient-to-br from-primary/8 via-transparent to-transparent p-4 shadow-sm sm:p-5',
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground">Búsqueda real en YouTube</span>
            {apiReportedVideos ? (
              <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-primary">
                {longTotal} vídeo{longTotal === 1 ? '' : 's'} · {shortTotal} short{shortTotal === 1 ? '' : 's'}
              </span>
            ) : null}
          </div>

          {s.summary?.trim() ? (
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                Resumen del análisis
              </p>
              <p className="mt-2 text-sm leading-relaxed text-foreground/90">{s.summary.trim()}</p>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                El modelo interpreta los títulos y canales devueltos por la API oficial (sin inventar enlaces a
                vídeos). Abre las tarjetas para comprobar el contenido en YouTube.
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm italic text-muted-foreground">Sin resumen del modelo para este bloque.</p>
          )}

          {hasVideoCards ? (
            <div className="mt-6 space-y-6">
              {long.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Vídeos destacados <span className="tabular-nums">({long.length})</span>
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {long.slice(0, 4).map(v => (
                      <ValidationReferenceCard
                        key={`L-${v.videoId}`}
                        href={`https://www.youtube.com/watch?v=${encodeURIComponent(v.videoId)}`}
                        title={v.title}
                        subtitle={v.channelTitle ?? undefined}
                        imageUrl={`https://i.ytimg.com/vi/${encodeURIComponent(v.videoId)}/hqdefault.jpg`}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              {short.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Shorts <span className="tabular-nums">({short.length})</span>
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {short.slice(0, 3).map(v => (
                      <ValidationReferenceCard
                        key={`S-${v.videoId}`}
                        href={`https://www.youtube.com/watch?v=${encodeURIComponent(v.videoId)}`}
                        title={v.title}
                        subtitle={v.channelTitle ? `${v.channelTitle} · Short` : 'Short'}
                        imageUrl={`https://i.ytimg.com/vi/${encodeURIComponent(v.videoId)}/hqdefault.jpg`}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : apiReportedVideos ? (
            <div
              className="mt-5 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-foreground/90"
              role="status"
            >
              <p className="font-medium text-amber-900 dark:text-amber-100/95">
                Hay resultados de la API ({longTotal} + {shortTotal}), pero no se pudieron leer las muestras
                guardadas.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Suele pasar con validaciones antiguas o si cambió el formato de datos. Ejecuta de nuevo la
                validación desde la ficha o actualiza la app.
              </p>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-border bg-muted/15 px-4 py-4 text-center">
              <p className="text-sm text-muted-foreground">
                No hay resultados de la API de YouTube en esta validación. Comprueba{' '}
                <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs">YOUTUBE_API_KEY</code> en el
                backend, que esté activada la API &quot;YouTube Data API v3&quot; y que no se haya agotado la
                cuota.
              </p>
              {q ? (
                <a
                  href={socialSearchUrl('youtube', q)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Buscar en YouTube
                </a>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {AI_ORDER.map(key => {
        const block = ai?.[key]
        const meta = AI_SECTION_META[key]
        const Icon = meta.Icon
        const refs = block?.evidence_refs ?? []
        return (
          <div key={key}>
            <SectionHeading Icon={Icon} title={meta.title} iconClass={meta.iconClass} />
            <div
              className={cn(
                'rounded-2xl border border-border/80 bg-gradient-to-br from-primary/8 to-transparent p-4 sm:p-5',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">Señal estimada (IA)</span>
                {block != null ? (
                  <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-bold tabular-nums text-primary">
                    {block.signal}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
              {block ? (
                <p className="mt-3 text-sm leading-relaxed text-foreground/90">{block.synthetic_findings}</p>
              ) : (
                <p className="mt-3 text-sm italic text-muted-foreground">Sin bloque del modelo.</p>
              )}
              {refs.length > 0 ? (
                <div className="mt-5">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Fuentes para comprobar
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {refs.map((ref, i) => (
                      <ValidationReferenceCard
                        key={`${key}-${ref.url}-${i}`}
                        href={ref.url}
                        title={`${ref.title} · ${SEARCH_LINK_LABEL[key]}`}
                      />
                    ))}
                  </div>
                </div>
              ) : q ? (
                <a
                  href={socialSearchUrl(key, q)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex rounded-sm text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Abrir búsqueda en {SEARCH_LINK_LABEL[key]}
                </a>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
