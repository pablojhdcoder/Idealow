import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import AppShellHeader from '@/components/layout/AppShellHeader'
import { Button } from '@/components/ui/button'
import { PageBackButton } from '@/components/ui/page-back-button'
import {
  ValidationGeneratingCard,
  ValidationGeneratingLegacyHint,
} from '@/components/ideas/ValidationGeneratingCard'
import { ValidationProgress } from '@/components/ideas/ValidationProgress'
import { flashcardQueryKey } from '@/components/ideas/IdeaFlashcardDetailView'
import { fetchIdeaFlashcardDetail } from '@/lib/api/ideas'
import { postStartValidation } from '@/lib/api/validation'
import { ApiError } from '@/lib/api/client'
import { hydrateValidationSnapshot } from '@/lib/hydrateValidationSnapshot'
import { appPageMainClassName } from '@/lib/appPageLayout'

export default function IdeaValidate() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const backToFicha = () => navigate(`/ideas/${id}`, { state: location.state })
  const [legacyError, setLegacyError] = useState<string | null>(null)
  const [legacyLoading, setLegacyLoading] = useState(false)
  /** La validación arranca sola tras el refinamiento; el reintento solo tiene sentido si parece atascada. */
  const [stuckRecoveryEligible, setStuckRecoveryEligible] = useState(false)

  const accessQ = useQuery({
    queryKey: id ? flashcardQueryKey(id) : ['idea-flashcard', 'none'],
    queryFn: () => fetchIdeaFlashcardDetail(id!),
    enabled: Boolean(id),
    refetchInterval: q => {
      const d = q.state.data
      if (!d?.isOwner) return false
      if (d.validationSnapshot != null) return false
      if (d.flashcard.status === 'DRAFT') return false
      return 2500
    },
  })

  const hydrated = useMemo(() => {
    const snap = accessQ.data?.validationSnapshot
    if (snap == null) return null
    return hydrateValidationSnapshot(snap)
  }, [accessQ.data?.validationSnapshot])

  const fc = accessQ.data?.flashcard
  const needsRefinementFirst = Boolean(accessQ.data?.isOwner && fc?.status === 'DRAFT')
  const waitingSnapshot = Boolean(
    accessQ.data?.isOwner && hydrated == null && fc && fc.status !== 'DRAFT',
  )

  useEffect(() => {
    if (!waitingSnapshot || hydrated != null) {
      setStuckRecoveryEligible(false)
      return
    }
    const ms = 90_000
    const t = window.setTimeout(() => setStuckRecoveryEligible(true), ms)
    return () => window.clearTimeout(t)
  }, [waitingSnapshot, hydrated, id])

  const showValidationRecovery =
    stuckRecoveryEligible || legacyError != null || legacyLoading

  async function handleLegacyRun() {
    if (!id) return
    setLegacyError(null)
    setLegacyLoading(true)
    try {
      await postStartValidation(id)
      await queryClient.invalidateQueries({ queryKey: flashcardQueryKey(id) })
    } catch (e) {
      setLegacyError(e instanceof ApiError ? e.message : 'No se pudo iniciar la validación')
    } finally {
      setLegacyLoading(false)
    }
  }

  if (!id) {
    return (
      <div className="min-h-screen bg-background">
        <AppShellHeader />
        <main className={appPageMainClassName('py-12 text-center text-sm text-muted-foreground')}>
          Idea no encontrada.
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-background">
      <AppShellHeader />
      <main className={appPageMainClassName('pb-16 pt-6 sm:pt-8')}>
        <PageBackButton label="Volver a la ficha" className="mb-8" onClick={backToFicha} />

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
            Solo el autor de la idea puede ver la validación de mercado.
          </p>
        )}

        {accessQ.isSuccess && accessQ.data?.isOwner && needsRefinementFirst && (
          <div
            className="rounded-3xl border border-border bg-card px-6 py-10 text-center shadow-sm sm:px-10"
            role="status"
          >
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              Termina primero el asistente de refinamiento. La validación de mercado se genera{' '}
              <span className="font-medium text-foreground">automáticamente una sola vez</span> al enviar las
              respuestas del wizard.
            </p>
            <Button type="button" className="mt-6 rounded-full" onClick={backToFicha}>
              Ir a la ficha
            </Button>
          </div>
        )}

        {accessQ.isSuccess && accessQ.data?.isOwner && waitingSnapshot && hydrated == null && (
          <ValidationGeneratingCard
            footer={
              showValidationRecovery ? (
                <ValidationGeneratingLegacyHint
                  legacyError={legacyError}
                  legacyLoading={legacyLoading}
                  onForceRun={handleLegacyRun}
                />
              ) : null
            }
          />
        )}

        {accessQ.isSuccess && accessQ.data?.isOwner && hydrated != null && (
          <ValidationProgress state={hydrated} />
        )}
      </main>
    </div>
  )
}
