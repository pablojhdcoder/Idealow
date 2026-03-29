import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type HomeHeroProps = {
  className?: string
}

export function HomeHero({ className }: HomeHeroProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden px-4 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-16',
        className,
      )}
      aria-labelledby="home-hero-heading"
    >
      <div
        className="pointer-events-none absolute -left-32 top-0 size-[420px] rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-0 size-80 rounded-full bg-amber-400/15 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
        >
          <Badge
            variant="secondary"
            className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50 px-3 py-1 text-amber-800"
          >
            <Sparkles className="size-3.5" aria-hidden />
            Tú decides qué compartes
          </Badge>
        </motion.div>

        <motion.h1
          id="home-hero-heading"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="font-serif text-balance text-4xl tracking-tight text-foreground sm:text-5xl md:text-6xl"
        >
          Captura ideas en cualquier formato. Refina con claridad.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.18 }}
          className="mx-auto mt-5 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg"
        >
          Convierte texto, enlaces, audio, imágenes o vídeo en ideas estructuradas; valídalas con
          señales reales y guárdalas como fichas pulidas. Tú eliges qué publicar en la comunidad.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.26 }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
        >
          <Link to="/register" className={buttonVariants({ size: 'lg' })}>
            Empezar gratis
          </Link>
          <Link
            to="/login"
            className={buttonVariants({ variant: 'outline', size: 'lg' })}
          >
            Ya tengo cuenta
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
