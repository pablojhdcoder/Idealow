import { useEffect, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScoreRing } from '@/components/ideas/ScoreRing'
import { ValidationBreakdown } from '@/components/ideas/ValidationBreakdown'
import { CompetitorCard } from '@/components/ideas/CompetitorCard'
import { VoteButtons } from '@/components/ideas/VoteButtons'
import { CommentList } from '@/components/ideas/CommentList'
import { fetchIdeaFlashcardDetail, patchIdeaPublish, postIdeaFeedback } from '@/lib/api/ideas'
import { ApiError } from '@/lib/api/client'
import { sectorPillStyle } from '@/lib/sectorColors'
import { verdictScoreConfig } from '@/lib/flashcardVerdict'
import { ideasQueryKey } from '@/hooks/useIdeasQuery'
import type { IdeaFlashcard } from '@/types/flashcard'
import { useAuthStore } from '@/stores/authStore'

const feedQueryKey = ['feed'] as const

function flashcardQueryKey(ideaId: string) {
  return ['idea-flashcard', ideaId] as const
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="font-serif text-lg text-foreground">{children}</h3>
}

function VoteBar({ votes }: { votes: IdeaFlashcard['communityVotes'] }) {
  const t = votes.useful + votes.interesting + votes.notUseful
  if (t === 0) {
    return <div className="h-2 w-full rounded-full bg-muted" />
  }
  const u = (votes.useful / t) * 100
  const i = (votes.interesting / t) * 100
  const n = (votes.notUseful / t) * 100
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full bg-emerald-500" style={{ width: `${u}%` }} />
      <div className="h-full bg-amber-400" style={{ width: `${i}%` }} />
      <div className="h-full bg-red-400" style={{ width: `${n}%` }} />
    </div>
  )
}

function CommentSubmitForm({
  ideaId,
  myVote,
}: {
  ideaId: string
  myVote: IdeaFlashcard['myVote']
}) {
  const [text, setText] = useState('')
  const queryClient = useQueryClient()

  const m = useMutation({
    mutationFn: () =>
      postIdeaFeedback(ideaId, {
        vote: myVote!,
        comment: text.trim(),
      }),
    onSuccess: async () => {
      toast.success('Comentario publicado')
      setText('')
      await queryClient.invalidateQueries({ queryKey: ['idea-feedback', ideaId] })
      await queryClient.invalidateQueries({ queryKey: flashcardQueryKey(ideaId) })
      await queryClient.invalidateQueries({ queryKey: feedQueryKey })
    },
    onError: (e: unknown) => {
      if (e instanceof ApiError) toast.error(e.message)
      else toast.error('No se pudo publicar el comentario')
    },
  })

  if (!myVote) {
    return (
      <p className="text-xs text-muted-foreground">
        Elige un voto arriba para poder añadir un comentario opcional.
      </p>
    )
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={`comment-${ideaId}`}>Comentario (opcional, máx. 280)</Label>
      <Textarea
        id={`comment-${ideaId}`}
        value={text}
        maxLength={280}
        onChange={e => setText(e.target.value)}
        className="min-h-20 rounded-2xl"
        placeholder="¿Qué te parece esta idea?"
      />
      <Button
        type="button"
        className="rounded-2xl"
        disabled={!text.trim() || m.isPending}
        onClick={() => m.mutate()}
      >
        {m.isPending && <Loader2 className="size-4 animate-spin" />}
        Publicar comentario
      </Button>
    </div>
  )
}

type Props = {
  ideaId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function IdeaFlashcardSheet({ ideaId, open, onOpenChange }: Props) {
  const queryClient = useQueryClient()
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const user = useAuthStore(s => s.user)

  const q = useQuery({
    queryKey: ideaId ? flashcardQueryKey(ideaId) : ['idea-flashcard', 'none'],
    queryFn: () => fetchIdeaFlashcardDetail(ideaId!),
    enabled: open && Boolean(ideaId),
  })

  useEffect(() => {
    if (!open) setPublishDialogOpen(false)
  }, [open])

  const publishMut = useMutation({
    mutationFn: (isPublished: boolean) => patchIdeaPublish(ideaId!, isPublished),
    onSuccess: async () => {
      toast.success('Visibilidad actualizada')
      await queryClient.invalidateQueries({ queryKey: ideasQueryKey })
      await queryClient.invalidateQueries({ queryKey: feedQueryKey })
      if (ideaId) await queryClient.invalidateQueries({ queryKey: flashcardQueryKey(ideaId) })
    },
    onError: (e: unknown) => {
      if (e instanceof ApiError) toast.error(e.message)
      else toast.error('No se pudo actualizar')
    },
  })

  const fc = q.data?.flashcard
  const isOwner = q.data?.isOwner ?? false
  const pill = fc ? sectorPillStyle(fc.sector) : null
  const vcfg = fc ? verdictScoreConfig[fc.verdict] : null

  const voteInvalidateKeys: (readonly unknown[])[] = ideaId
    ? [ideasQueryKey, feedQueryKey, flashcardQueryKey(ideaId)]
    : [ideasQueryKey, feedQueryKey]

  return (
    <>
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl" showCloseButton>
          <DialogHeader>
            <DialogTitle>¿Compartir con la comunidad?</DialogTitle>
            <DialogDescription>
              Tu idea será visible para usuarios de Idealow. Podrán votar (útil / interesante / poco
              útil) y dejar comentarios.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setPublishDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="rounded-full"
              disabled={publishMut.isPending || !ideaId}
              onClick={() => {
                if (!ideaId) return
                publishMut.mutate(true, {
                  onSuccess: () => setPublishDialogOpen(false),
                })
              }}
            >
              {publishMut.isPending && <Loader2 className="size-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col overflow-hidden rounded-l-3xl border-l p-0 sm:max-w-lg md:max-w-xl"
          showCloseButton
        >
          {q.isLoading && (
            <div className="flex flex-1 items-center justify-center p-8">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          )}

          {q.isError && (
            <div className="p-6">
              <p className="text-sm text-destructive">
                {q.error instanceof ApiError ? q.error.message : 'No se pudo cargar la idea'}
              </p>
              <Button type="button" variant="outline" className="mt-4 rounded-2xl" onClick={() => void q.refetch()}>
                Reintentar
              </Button>
            </div>
          )}

          <AnimatePresence mode="wait">
            {fc && (
              <motion.div
                key={fc.id}
                initial={{ opacity: 0, scale: 0.97, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 16 }}
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                className="flex min-h-0 flex-1 flex-col"
              >
                <SheetHeader className="border-b border-border px-6 py-4 text-left">
                  <div className="flex flex-wrap items-start gap-3">
                    {pill ? (
                      <span
                        className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize"
                        style={pill}
                      >
                        {fc.sector}
                      </span>
                    ) : null}
                    {vcfg ? (
                      <span
                        className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={{ backgroundColor: vcfg.bg, color: vcfg.text }}
                      >
                        {vcfg.label}
                      </span>
                    ) : null}
                  </div>
                  <SheetTitle className="mt-2 pr-8 font-serif text-2xl leading-tight">
                    {fc.refinedTitle}
                  </SheetTitle>
                  <div className="mt-4 flex justify-center">
                    <ScoreRing score={fc.validationScore} verdict={fc.verdict} />
                  </div>
                </SheetHeader>

                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
                  <section className="space-y-3">
                    <SectionTitle>La idea</SectionTitle>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>
                        <span className="font-medium text-foreground">Problema · </span>
                        {fc.problemStatement || '—'}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Solución · </span>
                        {fc.solution || '—'}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Cliente · </span>
                        {fc.targetCustomer || '—'}
                      </p>
                    </div>
                  </section>

                  <Separator />

                  <section className="space-y-3">
                    <SectionTitle>Negocio</SectionTitle>
                    <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                      <p>
                        <span className="font-medium text-foreground">Monetización · </span>
                        {fc.monetization || '—'}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">MVP · </span>
                        {fc.mvpFeature || '—'}
                      </p>
                      <p className="sm:col-span-2">
                        <span className="font-medium text-foreground">Distribución · </span>
                        {fc.distribution || '—'}
                      </p>
                    </div>
                  </section>

                  <Separator />

                  <section className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <SectionTitle>Por qué ahora</SectionTitle>
                      <p className="mt-2 text-sm text-muted-foreground">{fc.whyNow || '—'}</p>
                    </div>
                    <div>
                      <SectionTitle>Mayor riesgo</SectionTitle>
                      <p className="mt-2 text-sm text-muted-foreground">{fc.biggestRisk || '—'}</p>
                    </div>
                  </section>

                  <Separator />

                  <section className="space-y-3">
                    <SectionTitle>Validación</SectionTitle>
                    <ValidationBreakdown breakdown={fc.validationBreakdown} />
                  </section>

                  {fc.competitors.length > 0 ? (
                    <>
                      <Separator />
                      <section className="space-y-3">
                        <SectionTitle>Competidores</SectionTitle>
                        <div className="flex gap-3 overflow-x-auto pb-2">
                          {fc.competitors.map((c, i) => (
                            <CompetitorCard key={`${c.name}-${i}`} competitor={c} />
                          ))}
                        </div>
                      </section>
                    </>
                  ) : null}

                  {fc.isPublished ? (
                    <>
                      <Separator />
                      <section className="space-y-4">
                        <SectionTitle>Comunidad</SectionTitle>
                        <VoteBar votes={fc.communityVotes} />
                        {!isOwner && user ? (
                          <VoteButtons
                            ideaId={fc.id}
                            disabled={false}
                            initialVotes={fc.communityVotes}
                            initialMyVote={fc.myVote}
                            queryKeysToInvalidate={voteInvalidateKeys}
                          />
                        ) : !isOwner ? (
                          <p className="text-xs text-muted-foreground">
                            Inicia sesión para votar en esta idea.
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            No puedes votar en tu propia idea.
                          </p>
                        )}
                        {!isOwner && user ? <CommentSubmitForm ideaId={fc.id} myVote={fc.myVote} /> : null}
                        <CommentList ideaId={fc.id} enabled={fc.isPublished} />
                      </section>
                    </>
                  ) : null}

                  {isOwner && fc.status === 'VALIDATED' ? (
                    <>
                      <Separator />
                      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/30 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <Label htmlFor="publish-switch" className="text-sm font-medium">
                              Compartir con la comunidad
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              {fc.isPublished
                                ? 'Visible en el feed público.'
                                : 'Solo tú ves los detalles hasta que publiques.'}
                            </p>
                          </div>
                          <Switch
                            id="publish-switch"
                            checked={fc.isPublished}
                            onCheckedChange={checked => {
                              if (checked) {
                                if (!fc.isPublished) setPublishDialogOpen(true)
                              } else if (fc.isPublished) {
                                publishMut.mutate(false)
                              }
                            }}
                            disabled={publishMut.isPending}
                          />
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </SheetContent>
      </Sheet>
    </>
  )
}
