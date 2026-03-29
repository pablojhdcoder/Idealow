import { useMemo, useState } from 'react'
import { Copy, Loader2, Mail, Share2 } from 'lucide-react'
import { FaLinkedin } from 'react-icons/fa'
import { FaWhatsapp } from 'react-icons/fa6'
import { SiX } from 'react-icons/si'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { publicFlashcardAbsoluteUrl } from '@/lib/publicFlashcardUrl'
import {
  buildPublicIdeaShareText,
  buildShareEmailSubject,
  buildSharePayloadFromIdea,
  canUseNativeShare,
  linkedInFeedPrefillUrl,
  mailtoShareUrl,
  shareNative,
  twitterIntentUrl,
  whatsAppShareUrl,
} from '@/lib/sharePublicIdea'

type Props = {
  ideaId: string
  refinedTitle: string
  status: string
  isPublished: boolean
}

export function IdeaExternalSharePanel({ ideaId, refinedTitle, status, isPublished }: Props) {
  const [sharing, setSharing] = useState(false)

  const publicUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return publicFlashcardAbsoluteUrl(window.location.origin, ideaId)
  }, [ideaId])

  const shareText = useMemo(
    () => buildPublicIdeaShareText({ title: refinedTitle, url: publicUrl }),
    [refinedTitle, publicUrl],
  )

  const canShare = status === 'VALIDATED' && isPublished

  const copyPublicLink = async () => {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      toast.success('Enlace copiado')
    } catch {
      toast.error('No se pudo copiar el enlace')
    }
  }

  const onNativeShare = async () => {
    if (!publicUrl || typeof window === 'undefined') return
    setSharing(true)
    try {
      await shareNative(
        buildSharePayloadFromIdea({
          origin: window.location.origin,
          ideaId,
          title: refinedTitle,
        }),
      )
    } catch (e) {
      if (e instanceof Error && e.message === 'navigator.share no disponible') {
        toast.error('Compartir no está disponible en este dispositivo')
      } else {
        toast.error('No se pudo abrir el diálogo de compartir')
      }
    } finally {
      setSharing(false)
    }
  }

  if (!canShare) {
    return (
      <section
        className="rounded-3xl border border-amber-500/25 bg-card/50 p-6 shadow-sm sm:p-8"
        aria-label="Compartir enlace no disponible aún"
      >
        <div className="flex flex-wrap items-start gap-2">
          <Share2 className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden />
          <div className="min-w-0 space-y-1">
            <p className="font-serif text-lg text-foreground">Compartir fuera de Idealow</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {status !== 'VALIDATED'
                ? 'Cuando la validación termine, podrás publicar la idea y obtener un enlace para compartir.'
                : 'Publica la idea en la comunidad para generar el enlace público y compartirlo por correo, WhatsApp u otras apps.'}
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-3xl border border-border bg-card/50 p-6 shadow-sm sm:p-8" aria-labelledby={`share-public-heading-${ideaId}`}>
      <div className="border-b border-border/50 pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <Share2 className="size-4 text-primary" aria-hidden />
          <h2 id={`share-public-heading-${ideaId}`} className="font-serif text-lg text-foreground">
            Compartir enlace público
          </h2>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          El enlace es el mismo para todos. Si usas WhatsApp, correo, X, compartir del sistema o LinkedIn, se añade solo
          un texto breve que invita a entrar; aquí solo ves la URL.
        </p>
      </div>

      <div className="space-y-5 pt-5">
        <div className="space-y-2">
          <Label htmlFor={`public-url-${ideaId}`}>Enlace</Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              id={`public-url-${ideaId}`}
              readOnly
              value={publicUrl}
              className="rounded-2xl border-border/60 bg-background/80 font-mono text-xs sm:flex-1"
            />
            <Button
              type="button"
              variant="outline"
              className="shrink-0 rounded-full border-border/60"
              onClick={() => void copyPublicLink()}
            >
              <Copy className="size-4" />
              Copiar enlace
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {canUseNativeShare() && (
            <Button
              type="button"
              className="rounded-full"
              disabled={sharing}
              onClick={() => void onNativeShare()}
            >
              {sharing ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />}
              Compartir…
            </Button>
          )}
          <a
            href={whatsAppShareUrl(shareText)}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: 'outline' }), 'inline-flex rounded-full border-border/60')}
          >
            <FaWhatsapp className="size-4" />
            WhatsApp
          </a>
          <a
            href={twitterIntentUrl(shareText)}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: 'outline' }), 'inline-flex rounded-full border-border/60')}
          >
            <SiX className="size-4" aria-hidden />
            X
          </a>
          <a
            href={linkedInFeedPrefillUrl(shareText)}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: 'outline' }), 'inline-flex rounded-full border-border/60')}
          >
            <FaLinkedin className="size-4" aria-hidden />
            LinkedIn
          </a>
          <a
            href={mailtoShareUrl(buildShareEmailSubject(refinedTitle), shareText)}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: 'outline' }), 'inline-flex rounded-full border-border/60')}
          >
            <Mail className="size-4" />
            Correo
          </a>
        </div>
      </div>
    </section>
  )
}
