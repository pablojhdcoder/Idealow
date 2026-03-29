import { useCallback, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Lightbulb, Loader2, Share2 } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import {
  IdeaFlashcardDetailView,
  flashcardQueryKey,
} from '@/components/ideas/IdeaFlashcardDetailView'
import { PublicFlashcardRegisterGate } from '@/components/ideas/PublicFlashcardRegisterGate'
import { PublicFlashcardTeaser } from '@/components/ideas/PublicFlashcardTeaser'
import { fetchIdeaFlashcardDetail } from '@/lib/api/ideas'
import { ApiError } from '@/lib/api/client'
import { appPageMainClassName } from '@/lib/appPageLayout'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

function truncate(text: string, max = 155): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function upsertMeta(
  key: 'name' | 'property',
  value: string,
  content: string,
): HTMLMetaElement {
  const selector = `meta[${key}="${value}"]`
  const existing = document.querySelector(selector)
  if (existing instanceof HTMLMetaElement) {
    existing.setAttribute('content', content)
    return existing
  }
  const m = document.createElement('meta')
  m.setAttribute(key, value)
  m.setAttribute('content', content)
  document.head.appendChild(m)
  return m
}

export default function IdeaPublic() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const fullFromQuery = searchParams.get('full') === '1'
  const user = useAuthStore(s => s.user)
  const authLoading = useAuthStore(s => s.isLoading)

  const [showReveal, setShowReveal] = useState(false)

  useEffect(() => {
    if (fullFromQuery) {
      setShowReveal(true)
    }
  }, [fullFromQuery])

  const q = useQuery({
    queryKey: id ? flashcardQueryKey(id) : ['idea-flashcard', 'none'],
    queryFn: () => fetchIdeaFlashcardDetail(id!),
    enabled: Boolean(id),
  })

  useEffect(() => {
    if (!id) return
    const prevTitle = document.title

    const baseTitle = 'Flashcard compartida · Idealow'
    const baseDesc = 'Explora una idea publicada en la comunidad de Idealow.'
    document.title = baseTitle
    const metas = [
      upsertMeta('name', 'description', baseDesc),
      upsertMeta('property', 'og:title', baseTitle),
      upsertMeta('property', 'og:description', baseDesc),
      upsertMeta('property', 'og:type', 'website'),
      upsertMeta('property', 'og:url', window.location.href),
      upsertMeta('name', 'twitter:card', 'summary_large_image'),
      upsertMeta('name', 'twitter:title', baseTitle),
      upsertMeta('name', 'twitter:description', baseDesc),
    ]

    const flashcard = q.data?.flashcard
    if (flashcard) {
      const title = `${flashcard.refinedTitle} · Idealow`
      const description = truncate(
        flashcard.elevatorPitch ||
          flashcard.problemStatement ||
          'Idea compartida en Idealow.',
      )
      document.title = title
      upsertMeta('name', 'description', description)
      upsertMeta('property', 'og:title', title)
      upsertMeta('property', 'og:description', description)
      upsertMeta('name', 'twitter:title', title)
      upsertMeta('name', 'twitter:description', description)
    }

    return () => {
      document.title = prevTitle
      for (const meta of metas) {
        if (meta.parentNode) meta.parentNode.removeChild(meta)
      }
    }
  }, [id, q.data?.flashcard])

  const openReveal = useCallback(() => {
    setShowReveal(true)
    setSearchParams({ full: '1' }, { replace: true })
  }, [setSearchParams])

  const backToTeaser = useCallback(() => {
    setShowReveal(false)
    setSearchParams({}, { replace: true })
  }, [setSearchParams])

  if (!id) {
    return (
      <main className={appPageMainClassName('flex min-h-screen items-center justify-center')}>
        <p className="text-sm text-muted-foreground">Idea no encontrada.</p>
      </main>
    )
  }

  const showDetailForUser = showReveal && user
  const showGate = showReveal && !authLoading && !user
  const showAuthSpinner = showReveal && authLoading

  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-background">
      <main className={appPageMainClassName('pb-16 pt-6 sm:pt-8')}>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <Share2 className="size-3.5" />
            Enlace público
          </span>
          {showDetailForUser ? (
            <Link
              to="/dashboard"
              className={cn(
                buttonVariants({ variant: 'default' }),
                'inline-flex shrink-0 gap-2 rounded-full shadow-sm',
              )}
            >
              <Lightbulb className="size-4" aria-hidden />
              Crear más ideas así
            </Link>
          ) : null}
        </div>

        {q.isLoading && (
          <div className="flex justify-center py-24">
            <Loader2 className="size-10 animate-spin text-primary" aria-label="Cargando" />
          </div>
        )}

        {q.error instanceof ApiError && (
          <p className="rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">
            {q.error.message}
          </p>
        )}

        {q.data && !showReveal && <PublicFlashcardTeaser flashcard={q.data.flashcard} onReveal={openReveal} />}

        {q.data && showAuthSpinner && (
          <div className="flex justify-center py-24">
            <Loader2 className="size-10 animate-spin text-primary" aria-label="Comprobando sesión" />
          </div>
        )}

        {q.data && showGate && id ? (
          <PublicFlashcardRegisterGate
            onBackToTeaser={backToTeaser}
            postAuthReturnPath={`/flashcard/${encodeURIComponent(id)}?full=1`}
          />
        ) : null}

        {q.data && showDetailForUser && (
          <IdeaFlashcardDetailView
            ideaId={id}
            flashcard={q.data.flashcard}
            isOwner={q.data.isOwner}
            attachments={q.data.attachments}
          />
        )}
      </main>
    </div>
  )
}
