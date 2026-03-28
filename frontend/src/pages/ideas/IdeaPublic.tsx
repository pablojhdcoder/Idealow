import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Copy, Loader2, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  IdeaFlashcardDetailView,
  flashcardQueryKey,
} from '@/components/ideas/IdeaFlashcardDetailView'
import { fetchIdeaFlashcardDetail } from '@/lib/api/ideas'
import { ApiError } from '@/lib/api/client'

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
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
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

  const copyPublicLink = async () => {
    try {
      const url = `${window.location.origin}/flashcard/${encodeURIComponent(id ?? '')}`
      await navigator.clipboard.writeText(url)
      toast.success('Enlace copiado al portapapeles')
    } catch {
      toast.error('No se pudo copiar el enlace')
    }
  }

  if (!id) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Idea no encontrada.</p>
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-background">
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
        <div className="mb-8 flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" className="rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-4" />
            Volver
          </Button>
          <Button type="button" variant="outline" className="rounded-full" onClick={() => void copyPublicLink()}>
            <Copy className="size-4" />
            Copiar enlace
          </Button>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <Share2 className="size-3.5" />
            Enlace público
          </span>
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

        {q.data && (
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
