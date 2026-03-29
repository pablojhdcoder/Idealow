import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Props = {
  onBackToTeaser: () => void
  /** Ruta interna tras autenticación (p. ej. `/flashcard/:id?full=1`). */
  postAuthReturnPath: string
  className?: string
}

export function PublicFlashcardRegisterGate({ onBackToTeaser, postAuthReturnPath, className }: Props) {
  return (
    <div className={cn('mx-auto w-full max-w-lg space-y-6', className)}>
      <Card className="rounded-3xl border-primary/20 bg-card p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="size-6" aria-hidden />
          </div>
          <h2 className="mt-4 font-serif text-2xl text-foreground">Detalle completo</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Para ver el detalle completo de esta idea (secciones ampliadas, validación y más) necesitas una cuenta en
            Idealow. Es gratis y te lleva un minuto.
          </p>
          <Link
            to="/register"
            state={{ from: postAuthReturnPath }}
            className={cn(buttonVariants({ variant: 'default' }), 'mt-6 inline-flex w-full max-w-xs rounded-full sm:w-auto')}
          >
            Crear cuenta
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{' '}
            <Link
              to="/login"
              state={{ from: postAuthReturnPath }}
              className="font-medium text-primary underline underline-offset-2 hover:text-primary/90"
            >
              Inicia sesión
            </Link>
          </p>
        </div>
      </Card>
      <button
        type="button"
        onClick={onBackToTeaser}
        className="mx-auto block w-full max-w-xs rounded-full py-2 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        Volver a la vista previa
      </button>
    </div>
  )
}
