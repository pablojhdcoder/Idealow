import { useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import AppShellHeader from '@/components/layout/AppShellHeader'
import { Button } from '@/components/ui/button'
import {
  IdeaFlashcardDetailView,
  flashcardQueryKey,
} from '@/components/ideas/IdeaFlashcardDetailView'
import { fetchIdeaFlashcardDetail } from '@/lib/api/ideas'
import { ApiError } from '@/lib/api/client'
import { backLabelForPath, safeReturnPath } from '@/lib/ideaDetailNavigation'

export default function IdeaDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = safeReturnPath(location.state)
  const backLabel = backLabelForPath(returnTo)

  const q = useQuery({
    queryKey: id ? flashcardQueryKey(id) : ['idea-flashcard', 'none'],
    queryFn: () => fetchIdeaFlashcardDetail(id!),
    enabled: Boolean(id),
  })

  if (!id) {
    return (
      <div className="min-h-screen bg-background">
        <AppShellHeader />
        <main className="mx-auto max-w-3xl px-4 py-12 text-center text-sm text-muted-foreground">
          Idea no encontrada.
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-background">
      <AppShellHeader />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="gap-2 rounded-full"
            onClick={() => navigate(returnTo)}
          >
            <ArrowLeft className="size-4" />
            {backLabel}
          </Button>
          {(q.data?.flashcard.status === 'REFINING' || q.data?.flashcard.status === 'VALIDATED') && (
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-primary/40 bg-primary/5"
              onClick={() => navigate(`/ideas/${id}/validar`, { state: location.state })}
            >
              {q.data.flashcard.status === 'VALIDATED' ? 'Ver validación' : 'Validar mercado'}
            </Button>
          )}
        </div>

        {q.isLoading && (
          <div className="flex justify-center py-24">
            <Loader2 className="size-10 animate-spin text-primary" aria-label="Cargando" />
          </div>
        )}

        {q.isError && (
          <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-8 text-center">
            <p className="text-sm text-destructive">
              {q.error instanceof ApiError ? q.error.message : 'No se pudo cargar la idea'}
            </p>
            <Button type="button" variant="outline" className="mt-4 rounded-full" onClick={() => void q.refetch()}>
              Reintentar
            </Button>
          </div>
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
