import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { APP_PAGE_WIDTH_CLASS } from '@/lib/appPageLayout'

type HomeFooterProps = {
  className?: string
}

export function HomeFooter({ className }: HomeFooterProps) {
  return (
    <footer
      className={cn('border-t border-border bg-card/50 px-4 py-10 sm:px-6', className)}
    >
      <div className={cn(APP_PAGE_WIDTH_CLASS, 'flex flex-col items-center justify-between gap-6 sm:flex-row')}>
        <div className="text-center sm:text-left">
          <p className="font-serif text-lg text-foreground">Idealow</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tus ideas son tuyas; la visibilidad en comunidad la controlas tú.
          </p>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          <Link
            to="/login"
            className="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-md px-1"
          >
            Iniciar sesión
          </Link>
          <Link
            to="/register"
            className="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-md px-1"
          >
            Crear cuenta
          </Link>
        </nav>
      </div>
    </footer>
  )
}
