import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          to="/"
          className="font-serif text-xl text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-lg"
        >
          Idealow
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3" aria-label="Main">
          <Link
            to="/login"
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            Sign in
          </Link>
          <Link to="/register" className={buttonVariants({ size: 'sm' })}>
            Get started
          </Link>
        </nav>
      </div>
    </motion.header>
  )
}
