import { useState, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { AudioLines, Download, Loader2 } from 'lucide-react'
import { FaRegFile, FaRegFileAlt, FaRegFilePdf } from 'react-icons/fa'
import { toast } from 'sonner'
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
import { patchIdeaPublish, postIdeaFeedback } from '@/lib/api/ideas'
import { ApiError } from '@/lib/api/client'
import { sectorPillStyle } from '@/lib/sectorColors'
import { verdictScoreConfig } from '@/lib/flashcardVerdict'
import { ideasQueryKey } from '@/hooks/useIdeasQuery'
import type { IdeaAttachment, IdeaFlashcard } from '@/types/flashcard'
import { useAuthStore } from '@/stores/authStore'
import { getFileKindFromMime } from '@/lib/fileKind'
import { cn } from '@/lib/utils'

const feedQueryKey = ['feed'] as const

export function flashcardQueryKey(ideaId: string) {
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

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function AttachmentTile({ a }: { a: IdeaAttachment }) {
  const src = `/api/files/${encodeURIComponent(a.id)}`
  const kind = getFileKindFromMime(a.mimeType, a.originalName)
  const box =
    'relative flex min-h-[140px] flex-col overflow-hidden rounded-2xl border border-border bg-muted/40'

  let preview: ReactNode = (
    <div className="flex flex-1 items-center justify-center p-4">
      <FaRegFile className="size-12 text-muted-foreground" aria-hidden />
    </div>
  )
  if (kind === 'image') {
    preview = (
      <div className="relative aspect-video w-full bg-black/5">
        <img src={src} alt="" className="size-full object-cover" loading="lazy" />
      </div>
    )
  } else if (kind === 'video') {
    preview = (
      <div className="bg-black/90 p-2">
        <video src={src} controls playsInline preload="metadata" className="mx-auto max-h-40 w-full rounded-xl" />
      </div>
    )
  } else if (kind === 'audio') {
    preview = (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4">
        <AudioLines className="size-10 text-primary" aria-hidden />
        <audio src={src} controls preload="metadata" className="h-9 w-full max-w-full" />
      </div>
    )
  } else if (kind === 'pdf') {
    preview = (
      <div className="flex flex-1 items-center justify-center p-4">
        <FaRegFilePdf className="size-12 text-red-600 dark:text-red-400" aria-hidden />
      </div>
    )
  } else if (kind === 'text') {
    preview = (
      <div className="flex flex-1 items-center justify-center p-4">
        <FaRegFileAlt className="size-12 text-muted-foreground" aria-hidden />
      </div>
    )
  }

  return (
    <div className={cn(box, 'shadow-sm transition-shadow hover:shadow-md')}>
      {preview}
      <div className="flex items-start justify-between gap-2 border-t border-border bg-card/80 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-foreground" title={a.originalName}>
            {a.originalName}
          </p>
          <p className="text-[10px] text-muted-foreground">{formatBytes(a.sizeBytes)}</p>
        </div>
        <a
          href={src}
          download={a.originalName}
          className="inline-flex shrink-0 rounded-full border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Descargar"
        >
          <Download className="size-4" />
        </a>
      </div>
    </div>
  )
}

function IdeaAttachmentsSection({ attachments }: { attachments: IdeaAttachment[] }) {
  return (
    <section className="mt-10 scroll-mt-8 rounded-3xl border border-border bg-card/50 p-6 shadow-sm sm:p-8">
      <SectionTitle>Archivos aportados</SectionTitle>
      <p className="mt-2 text-sm text-muted-foreground">
        Material que usaste al capturar esta idea (texto extraído en el servidor a partir de estos
        archivos).
      </p>
      {attachments.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
          Esta idea se creó solo con texto; no hay adjuntos.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {attachments.map(a => (
            <li key={a.id}>
              <AttachmentTile a={a} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

type Props = {
  ideaId: string
  flashcard: IdeaFlashcard
  isOwner: boolean
  attachments: IdeaAttachment[]
}

export function IdeaFlashcardDetailView({ ideaId, flashcard: fc, isOwner, attachments }: Props) {
  const queryClient = useQueryClient()
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const user = useAuthStore(s => s.user)

  const publishMut = useMutation({
    mutationFn: (isPublished: boolean) => patchIdeaPublish(ideaId, isPublished),
    onSuccess: async () => {
      toast.success('Visibilidad actualizada')
      await queryClient.invalidateQueries({ queryKey: ideasQueryKey })
      await queryClient.invalidateQueries({ queryKey: feedQueryKey })
      await queryClient.invalidateQueries({ queryKey: flashcardQueryKey(ideaId) })
    },
    onError: (e: unknown) => {
      if (e instanceof ApiError) toast.error(e.message)
      else toast.error('No se pudo actualizar')
    },
  })

  const pill = sectorPillStyle(fc.sector)
  const vcfg = verdictScoreConfig[fc.verdict]

  const voteInvalidateKeys: (readonly unknown[])[] = [ideasQueryKey, feedQueryKey, flashcardQueryKey(ideaId)]

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
              disabled={publishMut.isPending}
              onClick={() => {
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

      <motion.article
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
      >
        <header className="border-b border-border bg-gradient-to-b from-primary/[0.04] to-transparent px-6 py-8 text-center sm:px-10">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span
              className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize"
              style={pill}
            >
              {fc.sector}
            </span>
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{ backgroundColor: vcfg.bg, color: vcfg.text }}
            >
              {vcfg.label}
            </span>
          </div>
          <h1 className="mx-auto mt-4 max-w-3xl font-serif text-3xl leading-tight text-foreground sm:text-4xl">
            {fc.refinedTitle}
          </h1>
          {fc.elevatorPitch ? (
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {fc.elevatorPitch}
            </p>
          ) : null}
          <div className="mt-8 flex justify-center">
            <ScoreRing score={fc.validationScore} verdict={fc.verdict} className="scale-110" />
          </div>
        </header>

        <div className="space-y-8 px-6 py-8 sm:px-10 sm:py-10">
          <section className="space-y-3">
            <SectionTitle>La idea</SectionTitle>
            <div className="space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
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
            <div className="grid gap-3 text-sm leading-relaxed text-muted-foreground sm:grid-cols-2 sm:text-[15px]">
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

          <section className="grid gap-6 sm:grid-cols-2">
            <div>
              <SectionTitle>Por qué ahora</SectionTitle>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">{fc.whyNow || '—'}</p>
            </div>
            <div>
              <SectionTitle>Mayor riesgo</SectionTitle>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                {fc.biggestRisk || '—'}
              </p>
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
                  <p className="text-xs text-muted-foreground">Inicia sesión para votar en esta idea.</p>
                ) : (
                  <p className="text-xs text-muted-foreground">No puedes votar en tu propia idea.</p>
                )}
                {!isOwner && user ? <CommentSubmitForm ideaId={fc.id} myVote={fc.myVote} /> : null}
                <CommentList ideaId={fc.id} enabled={fc.isPublished} />
              </section>
            </>
          ) : null}

          {isOwner && fc.status === 'VALIDATED' ? (
            <>
              <Separator />
              <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/30 p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Label htmlFor="publish-switch-page" className="text-sm font-medium">
                      Compartir con la comunidad
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {fc.isPublished
                        ? 'Visible en el feed público.'
                        : 'Solo tú ves los detalles hasta que publiques.'}
                    </p>
                  </div>
                  <Switch
                    id="publish-switch-page"
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
      </motion.article>

      <IdeaAttachmentsSection attachments={attachments} />
    </>
  )
}
