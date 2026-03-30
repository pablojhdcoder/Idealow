import { Link } from 'react-router-dom'
import { AppLogo } from '@/components/layout/AppLogo'
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
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:gap-3">
            <AppLogo size="sm" decorative alignWithWordmark className="max-h-8" />
            <p className="font-serif text-2xl tracking-tight text-foreground">Idealow</p>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            El lugar ideal para empezar a sembrar tus ideas.
          </p>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          <a
            href="#que-hace"
            className="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-md px-1"
          >
            Qué hace
          </a>
          <a
            href="#roadmap"
            className="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-md px-1"
          >
            Roadmap
          </a>
          <a
            href="#preguntas-frecuentes"
            className="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-md px-1"
          >
            FAQ
          </a>
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
