import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { appPageMainClassName } from '@/lib/appPageLayout'

type HomeLandingHeaderProps = {
  className?: string
}

export function HomeLandingHeader({ className }: HomeLandingHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn(
        'sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md',
        className,
      )}
    >
      <div className={appPageMainClassName('flex h-16 items-center justify-between gap-4')}>
        <Link
          to="/"
          className="rounded-lg font-serif text-2xl tracking-tight text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          Idealow
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3" aria-label="Principal">
          <Link
            to="/login"
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            Iniciar sesión
          </Link>
          <Link to="/register" className={buttonVariants({ size: 'sm' })}>
            Empezar
          </Link>
        </nav>
      </div>
    </motion.header>
  )
}
