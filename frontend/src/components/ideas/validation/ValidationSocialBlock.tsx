import type { ComponentType, ReactNode } from 'react'
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

/** Misma regla que x/instagram/tiktok: `signal` en el bloque IA; fallback solo para snapshots antiguos. */
function socialPlatformSignalPill(
  block: { signal: number } | undefined,
  legacyOverallScore: number | undefined,
): ReactNode {
  if (block != null && typeof block.signal === 'number' && !Number.isNaN(block.signal)) {
    return block.signal
  }
  if (typeof legacyOverallScore === 'number' && !Number.isNaN(legacyOverallScore)) {
    return legacyOverallScore
  }
  return '—'
}

/** Mismo estilo de tarjeta para YouTube y las estimaciones IA. */
const SOCIAL_CARD_CLASS =
  'rounded-2xl border border-border/80 bg-gradient-to-br from-primary/8 to-transparent p-4 sm:p-5'

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

function ResumenDelAnalisisHeader({ value }: { value: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
        Resumen del análisis
      </p>
      <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-bold tabular-nums text-primary">
        {value}
      </span>
    </div>
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
  const ytItemsTotal = longTotal + shortTotal
  const hasVideoCards = long.length > 0 || short.length > 0
  const apiReportedVideos = ytItemsTotal > 0

  const youtubeAi = ai?.youtube
  const youtubePillValue = socialPlatformSignalPill(youtubeAi, typeof s.score === 'number' ? s.score : undefined)
  /** Solo `synthetic_findings` cuando hay bloque YouTube; el `summary` global mezcla redes y no debe usarse aquí. */
  const youtubeNarrative =
    youtubeAi != null
      ? youtubeAi.synthetic_findings?.trim() || ''
      : s.summary?.trim() || ''
  const youtubeRefs = youtubeAi?.evidence_refs ?? []

  if (s.status !== 'done') return null

  return (
    <div className="mt-5 space-y-10">
      <div>
        <SectionHeading Icon={FaYoutube} title="YouTube" iconClass="text-[#FF0000]" />
        <div className={SOCIAL_CARD_CLASS}>
          <ResumenDelAnalisisHeader value={youtubePillValue} />

          {youtubeNarrative ? (
            <div className="mt-3">
              <p className="text-sm leading-relaxed text-foreground/90">{youtubeNarrative}</p>
              {hasVideoCards ? (
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Abre las tarjetas para revisar el contenido en YouTube.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm italic text-muted-foreground">Sin resumen del modelo para este bloque.</p>
          )}

          {youtubeRefs.length > 0 || hasVideoCards ? (
            <div className="mt-5">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Fuentes
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {youtubeRefs.map((ref, i) => (
                  <ValidationReferenceCard
                    key={`youtube-ref-${ref.url}-${i}`}
                    href={ref.url}
                    title={`${ref.title} · YouTube`}
                  />
                ))}
                {long.slice(0, 4).map(v => (
                  <ValidationReferenceCard
                    key={`L-${v.videoId}`}
                    href={`https://www.youtube.com/watch?v=${encodeURIComponent(v.videoId)}`}
                    title={v.title}
                    subtitle={v.channelTitle ?? undefined}
                    imageUrl={`https://i.ytimg.com/vi/${encodeURIComponent(v.videoId)}/hqdefault.jpg`}
                  />
                ))}
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
          ) : apiReportedVideos ? (
            <div
              className="mt-5 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-foreground/90"
              role="status"
            >
              <p className="font-medium text-amber-900 dark:text-amber-100/95">
                Hay resultados asociados a esta validación, pero no pudimos mostrarlos como tarjetas.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Puedes volver a ejecutar la validación desde la ficha de la idea.
              </p>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-border bg-muted/15 px-4 py-4 text-center">
              <p className="text-sm text-muted-foreground">
                No hay vídeos ni enlaces de exploración en esta validación. Si quieres seguir investigando el
                tema, puedes buscar en YouTube.
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
            <div className={SOCIAL_CARD_CLASS}>
              <ResumenDelAnalisisHeader value={socialPlatformSignalPill(block, undefined)} />

              {block ? (
                <p className="mt-3 text-sm leading-relaxed text-foreground/90">{block.synthetic_findings}</p>
              ) : (
                <p className="mt-3 text-sm italic text-muted-foreground">Sin bloque del modelo.</p>
              )}
              {refs.length > 0 ? (
                <div className="mt-5">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Fuentes
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
