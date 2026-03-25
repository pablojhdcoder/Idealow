import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2, Paperclip, Plus, X } from 'lucide-react'
import { AttachmentPreview } from '@/components/ideas/AttachmentPreview'
import { toast } from 'sonner'
import AppShellHeader from '@/components/layout/AppShellHeader'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api/client'
import { createIdea } from '@/lib/api/ideas'
import { uploadFile } from '@/lib/api/files'
import { ideasQueryKey } from '@/hooks/useIdeasQuery'

const SECTOR_OPTIONS = [
  { value: '', label: 'Sin preferencia' },
  { value: 'tech', label: 'Tech' },
  { value: 'health', label: 'Salud' },
  { value: 'finance', label: 'Finanzas' },
  { value: 'education', label: 'Educación' },
  { value: 'travel', label: 'Viajes' },
  { value: 'food', label: 'Comida' },
  { value: 'sports', label: 'Deportes' },
  { value: 'entertainment', label: 'Entretenimiento' },
  { value: 'productivity', label: 'Productividad' },
  { value: 'other', label: 'Otro' },
] as const

const MAX_FILES = 12

type AttachedFile = {
  key: string
  file: File
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function NewIdea() {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const backTo =
    location.state && typeof location.state === 'object' && 'from' in location.state
      ? String((location.state as { from?: string }).from || '/dashboard')
      : '/dashboard'

  const [content, setContent] = useState('')
  const [sector, setSector] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return
    const incoming = Array.from(list)
    setAttachedFiles(prev => {
      const next = [...prev]
      for (const file of incoming) {
        if (next.length >= MAX_FILES) {
          toast.message(`Máximo ${MAX_FILES} archivos por idea`)
          break
        }
        const dup = next.some(
          f => f.file.name === file.name && f.file.size === file.size && f.file.lastModified === file.lastModified,
        )
        if (!dup) {
          next.push({ key: crypto.randomUUID(), file })
        }
      }
      return next
    })
  }

  const removeFile = (key: string) => {
    setAttachedFiles(prev => prev.filter(a => a.key !== key))
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const trimmed = content.trim()
      let fileIds: string[] = []

      if (attachedFiles.length > 0) {
        const uploads = await Promise.all(attachedFiles.map(a => uploadFile(a.file)))
        fileIds = uploads.map(u => u.fileId)
      }

      return createIdea({
        content: trimmed || undefined,
        fileIds: fileIds.length > 0 ? fileIds : undefined,
        sector: sector || undefined,
      })
    },
    onSuccess: data => {
      void queryClient.invalidateQueries({ queryKey: ideasQueryKey })
      toast.success('Idea creada', {
        description: data.extracted.title,
      })
      navigate('/ideas', { state: { highlightId: data.ideaId, openRefineId: data.ideaId } })
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        toast.error(err.message)
        return
      }
      toast.error('No se pudo crear la idea')
    },
  })

  const handleSubmit = () => {
    const trimmed = content.trim()
    if (!trimmed && attachedFiles.length === 0) {
      toast.error('Escribe algo o adjunta al menos un archivo')
      return
    }
    createMutation.mutate()
  }

  const busy = createMutation.isPending

  return (
    <div className="min-h-screen bg-background">
      <AppShellHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link
          to={backTo}
          className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Volver"
        >
          <ArrowLeft className="size-4" />
        </Link>

        <Card className="mt-4 p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Plus className="size-5" />
            </div>
            <div>
              <h1 className="font-serif text-2xl text-foreground">Capturar idea</h1>
              <p className="text-sm text-muted-foreground">
                Puedes combinar texto con varios archivos (audio, imagen, vídeo, PDF, notas) como fuentes.
              </p>
            </div>
          </div>

          <div className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="idea-content">Contenido</Label>
              <Textarea
                id="idea-content"
                className="min-h-32 rounded-2xl"
                placeholder="Escribe tu idea, pega notas o una URL…"
                value={content}
                onChange={e => setContent(e.target.value)}
                disabled={busy}
                aria-busy={busy}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="idea-sector">Sector (opcional)</Label>
              <select
                id="idea-sector"
                value={sector}
                onChange={e => setSector(e.target.value)}
                disabled={busy}
                className="border-input bg-background h-11 w-full rounded-2xl border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {SECTOR_OPTIONS.map(opt => (
                  <option key={opt.value || 'none'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              multiple
              accept="text/plain,text/markdown,application/pdf,.md,.txt,.pdf,audio/*,image/*,video/mp4,.mp4,.m4a,.wav,.ogg,.mp3"
              onChange={e => {
                addFiles(e.target.files)
                e.target.value = ''
              }}
            />

            {attachedFiles.length > 0 && (
              <div className="grid gap-3">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-foreground">Archivos ({attachedFiles.length}/{MAX_FILES})</Label>
                </div>
                <div
                  className={
                    attachedFiles.length === 1
                      ? 'grid grid-cols-1 justify-items-center'
                      : 'grid grid-cols-2 items-stretch gap-3'
                  }
                >
                  {attachedFiles.map(({ key, file }) => (
                    <motion.div
                      key={key}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={
                        attachedFiles.length === 1
                          ? 'flex h-full min-h-0 w-full max-w-[min(100%,50%)]'
                          : 'flex h-full min-h-0 min-w-0'
                      }
                    >
                      <div className="flex h-full min-h-0 w-full flex-col rounded-2xl border border-border bg-muted/40 p-3 sm:p-4">
                        <div className="flex min-h-0 flex-1 flex-col gap-3">
                          <div className="flex min-h-0 flex-1 items-start justify-start">
                            <AttachmentPreview file={file} compact />
                          </div>
                          <div className="flex shrink-0 items-start justify-between gap-1.5">
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <p
                                className="line-clamp-2 break-all text-xs font-medium leading-tight text-foreground sm:text-sm"
                                title={file.name}
                              >
                                {file.name}
                              </p>
                              <p className="mt-0.5 truncate text-[10px] text-muted-foreground sm:text-xs">
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8 shrink-0 rounded-full"
                              onClick={() => removeFile(key)}
                              disabled={busy}
                              aria-label={`Quitar ${file.name}`}
                            >
                              <X className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-2xl"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy || attachedFiles.length >= MAX_FILES}
              >
                <Paperclip className="size-4" />
                {attachedFiles.length > 0 ? 'Añadir archivos' : 'Adjuntar archivos'}
              </Button>
              <Button
                type="button"
                className="h-11 rounded-2xl"
                onClick={handleSubmit}
                disabled={busy}
              >
                {busy && <Loader2 className="size-4 animate-spin" />}
                Continuar
              </Button>
            </div>

            {busy && (
              <p className="text-sm text-muted-foreground">
                Subiendo y extrayendo la idea con IA… Esto puede tardar un poco si hay varios archivos.
              </p>
            )}
          </div>
        </Card>
      </main>
    </div>
  )
}
