import { useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import AppShellHeader from '@/components/layout/AppShellHeader'
import { Button } from '@/components/ui/button'
import { ValidationProgress } from '@/components/ideas/ValidationProgress'
import { flashcardQueryKey } from '@/components/ideas/IdeaFlashcardDetailView'
import { fetchIdeaFlashcardDetail } from '@/lib/api/ideas'
import { ApiError } from '@/lib/api/client'

export default function IdeaValidate() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const backToFicha = () => navigate(`/ideas/${id}`, { state: location.state })

  const accessQ = useQuery({
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
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
        <Button
          type="button"
          variant="outline"
          className="mb-8 gap-2 rounded-full"
          onClick={backToFicha}
        >
          <ArrowLeft className="size-4" />
          Volver a la ficha
        </Button>

        {accessQ.isLoading && (
          <div className="flex justify-center py-24">
            <Loader2 className="size-10 animate-spin text-primary" aria-label="Cargando" />
          </div>
        )}

        {accessQ.isError && (
          <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-8 text-center">
            <p className="text-sm text-destructive">
              {accessQ.error instanceof ApiError ? accessQ.error.message : 'No se pudo cargar la idea'}
            </p>
          </div>
        )}

        {accessQ.isSuccess && accessQ.data && !accessQ.data.isOwner && (
          <p className="rounded-3xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Solo el autor de la idea puede ejecutar la validación de mercado.
          </p>
        )}

        {accessQ.isSuccess && accessQ.data?.isOwner && (
          <ValidationProgress ideaId={id} onClose={backToFicha} />
        )}
      </main>
    </div>
  )
}
