import { motion } from 'framer-motion'
import { Check, CircleDot, Compass } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollReveal } from '@/components/ui/scroll-reveal'
import { cn } from '@/lib/utils'
import { APP_PAGE_WIDTH_CLASS } from '@/lib/appPageLayout'

const LIVE = [
  'Captura multiformato (texto, archivos, audio, imagen, vídeo)',
  'Refinamiento guiado con IA (estructura clara y accionable)',
  'Motor de validación con fuentes públicas e IA',
  'Embeddings y búsqueda semántica entre ideas',
  'Flashcards con puntuación de validación',
  'Feed comunitario con votos y comentarios',
] as const

const NEXT = [
  'Más fuentes y profundidad en informes de validación',
  'Exportación y plantillas para compartir fuera de la app',
  'Recordatorios y seguimiento de ideas en curso',
  'Mejoras de accesibilidad y rendimiento en móvil',
] as const

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
}

const fadeItem = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
  },
}

type HomeRoadmapProps = {
  className?: string
}

export function HomeRoadmap({ className }: HomeRoadmapProps) {
  return (
    <section
      id="roadmap"
      className={cn('scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20', className)}
      aria-labelledby="home-roadmap-heading"
    >
      <div className={APP_PAGE_WIDTH_CLASS}>
        <ScrollReveal>
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="home-roadmap-heading"
              className="font-serif text-2xl text-foreground sm:text-3xl"
            >
              Roadmap
            </h2>
            <Badge
              variant="secondary"
              className="rounded-full border border-amber-200/80 bg-amber-50/90 px-2.5 py-0.5 text-xs font-medium text-amber-900 shadow-sm"
            >
              Evoluciona contigo
            </Badge>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Transparencia sobre lo que ya puedes usar y hacia dónde vamos.
          </p>
        </ScrollReveal>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-40px' }}
          className="mt-10 grid gap-6 lg:grid-cols-2"
        >
          <motion.div variants={fadeItem}>
            <Card className="h-full rounded-2xl border-primary/15 bg-gradient-to-br from-card to-primary/[0.03] shadow-sm">
              <CardContent className="p-6 sm:p-7">
                <div className="flex items-center gap-2 text-primary">
                  <Check className="size-5 shrink-0" strokeWidth={2} aria-hidden />
                  <h3 className="font-semibold text-foreground">Disponible hoy</h3>
                </div>
                <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
                  {LIVE.map((line) => (
                    <li key={line} className="flex gap-2.5 leading-relaxed">
                      <span
                        className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70"
                        aria-hidden
                      />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeItem}>
            <Card className="h-full rounded-2xl border-dashed border-primary/25 bg-muted/20 shadow-sm">
              <CardContent className="p-6 sm:p-7">
                <div className="flex items-center gap-2 text-foreground">
                  <Compass className="size-5 shrink-0 text-primary" strokeWidth={2} aria-hidden />
                  <h3 className="font-semibold text-foreground">Próximos focos</h3>
                </div>
                <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
                  Nuestas siguientes prioridades.
                </p>
                <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
                  {NEXT.map((line) => (
                    <li key={line} className="flex gap-2.5 leading-relaxed">
                      <CircleDot
                        className="mt-0.5 size-4 shrink-0 text-primary/60"
                        strokeWidth={2}
                        aria-hidden
                      />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
