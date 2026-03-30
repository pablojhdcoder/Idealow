import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { buttonVariants } from '@/components/ui/button'
import { AppLogo } from '@/components/layout/AppLogo'
import { cn } from '@/lib/utils'
import { appPageMainClassName } from '@/lib/appPageLayout'

type HomeLandingHeaderProps = {
  className?: string
}

export function HomeLandingHeader({ className }: HomeLandingHeaderProps) {
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)

  useMotionValueEvent(scrollY, 'change', (y) => {
    setScrolled(y > 12)
  })

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn(
        'sticky top-0 z-50 border-b backdrop-blur-md transition-[background-color,box-shadow,border-color] duration-300',
        scrolled
          ? 'border-border/80 bg-background/95 shadow-sm'
          : 'border-transparent bg-background/80',
        className,
      )}
    >
      <div className={appPageMainClassName('flex h-16 items-center justify-between gap-4')}>
        <Link
          to="/"
          className="flex min-w-0 items-center gap-2 rounded-lg font-serif text-2xl tracking-tight text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <AppLogo size="sm" decorative alignWithWordmark className="max-h-8 shrink-0" />
          <span className="truncate">Idealow</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Principal">
          <div className="mr-1 hidden items-center gap-1 border-r border-border/60 pr-2 md:flex">
            <a
              href="#que-hace"
              className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              Qué hace
            </a>
            <a
              href="#roadmap"
              className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              Roadmap
            </a>
            <a
              href="#preguntas-frecuentes"
              className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              FAQ
            </a>
          </div>
          <Link
            to="/login"
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              'font-medium text-muted-foreground hover:text-foreground',
            )}
          >
            Iniciar sesión
          </Link>
          <Link
            to="/register"
            className={cn(buttonVariants({ size: 'sm' }), 'font-semibold')}
          >
            Empezar
          </Link>
        </nav>
      </div>
    </motion.header>
  )
}
