import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Globe2, Loader2, Paperclip, PenLine, Plus, Shapes, Sparkles, WandSparkles, X } from 'lucide-react'
import { AttachmentPreview } from '@/components/ideas/AttachmentPreview'
import { toast } from 'sonner'
import AppShellHeader from '@/components/layout/AppShellHeader'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageBackButton } from '@/components/ui/page-back-button'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api/client'
import { createIdea } from '@/lib/api/ideas'
import { uploadAttachedFilesForIdea, UploadFileError } from '@/lib/api/files'
import { ideasQueryKey } from '@/hooks/useIdeasQuery'
import { buildNewIdeaStarterContent, getDashboardStarterById } from '@/lib/dashboardSuggestions'
import { readPrivateIdeasByDefault, writePrivateIdeasByDefault } from '@/lib/ideaVisibilityPreference'
import { appPageMainClassName } from '@/lib/appPageLayout'
import { generateIdeaSuggestionFromProfile } from '@/lib/api/users'
import { cn } from '@/lib/utils'

const SECTOR_OPTIONS = [
  { value: '', label: 'Sin preferencia' },
  { value: 'tech', label: 'Tecnología' },
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
/** Mismo tope que el backend: alineado con el límite de visión + base64 en Azure (~18 MB). */
const MAX_FILE_SIZE_MB = 18
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
const PAGE_EASE = [0.22, 1, 0.36, 1] as const

type AttachedFile = {
  key: string
  file: File
}

type IdeaVisibilityProps = {
  keepPrivate: boolean
  busy: boolean
  onChange: (checked: boolean) => void
}

function IdeaVisibilityCard({ keepPrivate, busy, onChange }: IdeaVisibilityProps) {
  return (
    <section className="flex h-full min-h-[18.5rem] flex-col rounded-2xl border border-primary/20 bg-primary/[0.06] p-5 sm:p-6">
      <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
        <Globe2 className="size-4 text-primary/80" aria-hidden />
        Visibilidad en la comunidad
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Por defecto tu idea se publicará en Idealow cuando termine la validación de mercado, para
        que la comunidad pueda votar y comentar, con el fin de validar la idea en la comunidad de Idealow.
      </p>
      <label className="mt-auto flex cursor-pointer items-start gap-3 rounded-xl border border-border/80 bg-background/80 p-3">
        <input
          type="checkbox"
          checked={keepPrivate}
          onChange={e => onChange(e.target.checked)}
          disabled={busy}
          className="border-input text-primary focus-visible:ring-ring mt-0.5 size-4 shrink-0 rounded-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        />
        <span className="text-sm leading-snug text-foreground">
          <span className="font-medium">No publicar en la comunidad</span>
          <span className="text-muted-foreground">
            <br />
            La idea será solo visible para ti hasta que decidas publicarla desde la ficha.
          </span>
        </span>
      </label>
    </section>
  )
}

type AttachmentsPanelProps = {
  attachedFiles: AttachedFile[]
  /** Solo creación de idea: spinner y mensaje de subida en el botón principal. */
  createPending: boolean
  /** Bloqueo del panel (crear o generar con IA): sin spinners cruzados. */
  locked: boolean
  onAddClick: () => void
  onRemoveFile: (key: string) => void
  onSubmit: () => void
}

function AttachmentsPanel({
  attachedFiles,
  createPending,
  locked,
  onAddClick,
  onRemoveFile,
  onSubmit,
}: AttachmentsPanelProps) {
  return (
    <Card className="rounded-3xl border-border/80 bg-card/90 p-5 shadow-sm backdrop-blur-sm sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 font-serif text-xl text-foreground">
          <Paperclip className="size-4 text-primary/80" aria-hidden />
          Adjuntos
        </h2>
        <Badge variant="outline">
          {attachedFiles.length}/{MAX_FILES}
        </Badge>
      </div>

      {attachedFiles.length > 0 && (
        <section className="mt-5 grid gap-3">
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
                        onClick={() => onRemoveFile(key)}
                        disabled={locked}
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
        </section>
      )}

      <section className="mt-5 flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-2xl border-border/80"
          onClick={onAddClick}
          disabled={locked || attachedFiles.length >= MAX_FILES}
        >
          <Paperclip className="size-4" />
          {attachedFiles.length > 0 ? 'Añadir archivos' : 'Adjuntar archivos'}
        </Button>
        <Button
          type="button"
          className="h-11 gap-2 rounded-2xl px-5 sm:min-w-[18rem]"
          onClick={onSubmit}
          disabled={locked}
        >
          {createPending && <Loader2 className="size-4 animate-spin" />}
          {!createPending && <Sparkles className="size-4" aria-hidden />}
          Crear idea
        </Button>
      </section>

      {attachedFiles.length === 0 && !createPending && (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          No es obligatorio adjuntar archivos, pero suele mejorar la extracción y el refinamiento de
          la idea.
        </p>
      )}

      {createPending && (
        <p className="mt-4 text-sm text-muted-foreground">
          Subiendo y extrayendo la idea con IA… Esto puede tardar un poco si hay varios archivos.
        </p>
      )}
    </Card>
  )
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function NewIdea() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const appliedQueryStarter = useRef(false)

  const backTo =
    location.state && typeof location.state === 'object' && 'from' in location.state
      ? String((location.state as { from?: string }).from || '/dashboard')
      : '/dashboard'

  const [content, setContent] = useState('')
  const [sector, setSector] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  /** Si true, la idea no se compartirá en el feed comunitario tras validar (solo tú la ves hasta que publiques). */
  const [keepPrivate, setKeepPrivate] = useState(readPrivateIdeasByDefault)

  useEffect(() => {
    if (appliedQueryStarter.current) return
    const starterId = searchParams.get('starter')
    const legacyPrompt = searchParams.get('prompt')
    if (starterId) {
      const starter = getDashboardStarterById(starterId)
      if (starter) {
        setContent(buildNewIdeaStarterContent(starter.shortLine))
        setSector(starter.sector)
        appliedQueryStarter.current = true
      }
      return
    }
    if (legacyPrompt) {
      try {
        const decoded = decodeURIComponent(legacyPrompt).trim()
        if (decoded) {
          const looksLikeFullDraft =
            decoded.startsWith('Idea base:') || decoded.includes('\n') || decoded.length > 220
          if (looksLikeFullDraft) {
            setContent(decoded)
          } else {
            const short = decoded.length > 220 ? `${decoded.slice(0, 220)}…` : decoded
            setContent(buildNewIdeaStarterContent(short))
          }
          appliedQueryStarter.current = true
        }
      } catch {
        appliedQueryStarter.current = true
      }
    }
  }, [searchParams])

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
        if (file.size > MAX_FILE_SIZE_BYTES) {  
          toast.error(`«${file.name}» supera el máximo de 50 MB por archivo`)
          continue
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

  const generateFromProfileMutation = useMutation({
    mutationFn: generateIdeaSuggestionFromProfile,
    onSuccess: data => {
      setContent(data.content.trim())
      toast.success('Texto generado', { description: 'Puedes editarlo antes de crear la idea.' })
    },
    onError: () => {
      toast.error('No se pudo generar con IA. Inténtalo de nuevo.')
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const trimmed = content.trim()
      let fileIds: string[] = []

      if (attachedFiles.length > 0) {
        fileIds = await uploadAttachedFilesForIdea(attachedFiles.map(a => a.file))
      }

      return createIdea({
        content: trimmed || undefined,
        fileIds: fileIds.length > 0 ? fileIds : undefined,
        sector: sector || undefined,
        isPublished: !keepPrivate,
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
      if (err instanceof UploadFileError) {
        toast.error(err.message)
        return
      }
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
  const generateBusy = generateFromProfileMutation.isPending
  const formLocked = busy || generateBusy

  return (
    <div className="min-h-screen bg-background">
      <AppShellHeader />
      <main className={appPageMainClassName('py-8 pb-14')}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: PAGE_EASE }}
        >
          <PageBackButton label="Volver" to={backTo} />
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: PAGE_EASE }}
          className="relative mt-5 overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/[0.09] via-background to-amber-500/[0.06] px-5 py-7 shadow-sm sm:px-8 sm:py-9"
        >
          <div
            className="pointer-events-none absolute -right-14 -top-20 size-52 rounded-full bg-primary/10 blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-wrap items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
              <Plus className="size-6" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <h1 className="font-serif text-3xl tracking-tight text-foreground sm:text-4xl">
                Capturar idea
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Escribe una nota rápida o combina texto con adjuntos para extraer una idea más
                estructurada con IA.
              </p>
            </div>
          </div>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.07, ease: PAGE_EASE }}
        >
          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
            <Card className="rounded-3xl border-border/80 bg-card/90 p-5 shadow-sm backdrop-blur-sm sm:p-7">
              <div className="grid gap-5">
                <section className="grid gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label htmlFor="idea-content" className="inline-flex items-center gap-2">
                      <PenLine className="size-4 text-primary/80" aria-hidden />
                      Contenido
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        'h-9 gap-1.5 rounded-full border-primary/35 bg-primary/[0.06] px-3.5 text-xs font-medium text-foreground',
                        'shadow-xs shadow-primary/10 transition-[border-color,background-color,box-shadow,color]',
                        'hover:border-primary/50 hover:bg-primary/12 hover:text-primary hover:shadow-sm hover:shadow-primary/15',
                        'disabled:opacity-60',
                      )}
                      disabled={formLocked}
                      onClick={() => generateFromProfileMutation.mutate()}
                      aria-busy={generateBusy}
                    >
                      <span
                        className="inline-flex size-4 shrink-0 items-center justify-center"
                        aria-hidden
                      >
                        {generateBusy ? (
                          <Loader2 className="size-4 animate-spin text-primary" />
                        ) : (
                          <WandSparkles className="size-4 text-primary" />
                        )}
                      </span>
                      Generar con IA
                    </Button>
                  </div>
                  <Textarea
                    id="idea-content"
                    className="min-h-48 rounded-2xl border-border/80 bg-background/80"
                    placeholder="Escribe tu idea o pega notas…"
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    disabled={formLocked}
                    aria-busy={formLocked}
                  />
                </section>

                <section className="grid gap-2">
                  <Label htmlFor="idea-sector" className="inline-flex items-center gap-2">
                    <Shapes className="size-4 text-primary/80" aria-hidden />
                    Sector (opcional)
                  </Label>
                  <select
                    id="idea-sector"
                    value={sector}
                    onChange={e => setSector(e.target.value)}
                    disabled={formLocked}
                    className="border-input bg-background h-11 w-full rounded-2xl border px-3 text-sm shadow-xs outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    {SECTOR_OPTIONS.map(opt => (
                      <option key={opt.value || 'none'} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </section>
              </div>
            </Card>

            <Card className="h-full rounded-3xl border-border/80 bg-card/90 p-5 shadow-sm backdrop-blur-sm sm:p-7">
              <IdeaVisibilityCard
                keepPrivate={keepPrivate}
                busy={formLocked}
                onChange={v => {
                  setKeepPrivate(v)
                  writePrivateIdeasByDefault(v)
                }}
              />
            </Card>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.11, ease: PAGE_EASE }}
          className="mt-4"
        >
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
          <AttachmentsPanel
            attachedFiles={attachedFiles}
            createPending={busy}
            locked={formLocked}
            onAddClick={() => fileInputRef.current?.click()}
            onRemoveFile={removeFile}
            onSubmit={handleSubmit}
          />
        </motion.div>
      </main>
    </div>
  )
}
