import { useEffect, useState } from 'react'
import { FaRegFilePdf, FaRegFileAlt, FaRegFile } from 'react-icons/fa'
import { AudioLines } from 'lucide-react'
import { getFileKind } from '@/lib/fileKind'
import { cn } from '@/lib/utils'

type Props = {
  file: File
  className?: string
  /**
   * En grid compacto: imagen thumbnail fijo; vídeo alargado (16:9) con ancho máximo; audio en una sola previewBox.
   */
  compact?: boolean
}

/**
 * Vista previa según tipo: imagen/vídeo (media real), PDF (FaRegFilePdf), audio (icono + reproductor), texto/otros (icono).
 */
export function AttachmentPreview({ file, className, compact = false }: Props) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setObjectUrl(url)
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [file])

  const kind = getFileKind(file)

  const previewBox =
    'relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted/60'

  if (!objectUrl) {
    return (
      <div
        className={cn(previewBox, 'size-28 animate-pulse sm:size-32', className)}
        aria-hidden
      />
    )
  }

  if (kind === 'image') {
    return (
      <div className={cn(previewBox, 'size-28 sm:h-36 sm:w-36', className)}>
        <img src={objectUrl} alt="" className="size-full object-cover" />
      </div>
    )
  }

  if (kind === 'video') {
    return (
      <div
        className={cn(
          previewBox,
          compact
            ? 'aspect-video w-full max-w-[220px] self-start sm:max-w-[280px]'
            : 'w-full max-w-[min(100%,320px)] sm:max-w-[280px]',
          className,
        )}
      >
        <video
          src={objectUrl}
          controls
          playsInline
          preload="metadata"
          className="h-full w-full min-h-0 rounded-xl bg-black object-contain"
        />
      </div>
    )
  }

  if (kind === 'audio') {
    return (
      <div
        className={cn(
          previewBox,
          'flex min-w-0 flex-col gap-2.5 p-3',
          compact ? 'w-full max-w-[220px] self-start sm:max-w-[280px]' : 'w-full sm:max-w-[280px]',
          className,
        )}
      >
        <AudioLines className="mx-auto size-14 shrink-0 text-primary sm:size-16" aria-hidden />
        <audio
          src={objectUrl}
          controls
          preload="metadata"
          className="h-9 w-full min-w-0 max-w-full"
        />
      </div>
    )
  }

  if (kind === 'pdf') {
    return (
      <div
        className={cn(previewBox, 'size-28 sm:size-32', className)}
        role="img"
        aria-label="Vista previa PDF"
      >
        
        <FaRegFilePdf className="size-14 text-red-600 dark:text-red-400" />
      </div>
    )
  }

  if (kind === 'text') {
    return (
      <div
        className={cn(previewBox, 'size-28 sm:size-32', className)}
        role="img"
        aria-label="Archivo de texto"
      >
        <FaRegFileAlt className="size-14 text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className={cn(previewBox, 'size-28 sm:size-32', className)} role="img" aria-label="Archivo">
      <FaRegFile className="size-14 text-muted-foreground" />
    </div>
  )
}
