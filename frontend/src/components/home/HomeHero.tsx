import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, Sparkles } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type HomeHeroProps = {
  className?: string
}

export function HomeHero({ className }: HomeHeroProps) {
  const reduceMotion = useReducedMotion()

  return (
    <section
      className={cn(
        // Una sola pantalla bajo el header (`h-16` = 4rem en `HomeLandingHeader`); al bajar aparece “Qué hace Idealow”.
        'relative flex min-h-[calc(100dvh-4rem)] flex-col justify-center overflow-x-hidden px-4 py-10 sm:px-6',
        className,
      )}
      aria-labelledby="home-hero-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/[0.14] via-primary/[0.05] to-transparent dark:from-primary/[0.12] dark:via-primary/[0.05]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05, ease: [0.22, 1, 0.36, 1] as const }}
        >
          <Badge
            variant="secondary"
            className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50/90 px-3 py-1 text-amber-900 shadow-sm"
          >
            <Sparkles className="size-3.5" aria-hidden />
            Empieza a sembrar tus ideas
          </Badge>
        </motion.div>

        <motion.h1
          id="home-hero-heading"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] as const }}
          className="font-serif text-balance text-4xl tracking-tight text-foreground sm:text-5xl md:text-6xl"
        >
          Captura ideas en cualquier formato.{' '}
          <span className="text-primary">Refina y valida</span> con claridad.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.18, ease: [0.22, 1, 0.36, 1] as const }}
          className="mx-auto mt-5 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg"
        >
          Convierte texto, audio, imágenes o vídeo en ideas estructuradas. Valídalas con
          señales reales y guárdalas como fichas pulidas.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.26, ease: [0.22, 1, 0.36, 1] as const }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
        >
          <Link
            to="/register"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'w-full min-w-[12rem] sm:w-auto',
            )}
          >
            Empezar gratis
          </Link>
          <Link
            to="/login"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'lg' }),
              'w-full min-w-[12rem] sm:w-auto',
            )}
          >
            Ya tengo cuenta
          </Link>
        </motion.div>
      </div>

      <motion.a
        href="#que-hace"
        className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-primary/70 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:bottom-8"
        aria-label="Ir a la sección Qué hace Idealow"
        animate={reduceMotion ? undefined : { y: [0, 8, 0] }}
        transition={
          reduceMotion ? undefined : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        <ChevronDown className="size-6" aria-hidden />
      </motion.a>
    </section>
  )
}
