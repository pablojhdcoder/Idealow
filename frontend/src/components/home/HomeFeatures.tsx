import { motion } from 'framer-motion'
import { Layers, Mic, Radar, Wand2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollReveal } from '@/components/ui/scroll-reveal'
import { cn } from '@/lib/utils'
import { APP_PAGE_WIDTH_CLASS } from '@/lib/appPageLayout'

const FEATURES = [
  {
    icon: Mic,
    title: 'Cualquier entrada',
    description:
      'Pega una nota, adjunta un archivo, sube una imagen o audio. Lo unificamos en texto con el que puedes trabajar.',
  },
  {
    icon: Wand2,
    title: 'Refinamiento guiado',
    description:
      'Un asistente breve te ayuda a afilar la idea para que sea accionable, no vaga.',
  },
  {
    icon: Radar,
    title: 'Contraste con la realidad',
    description:
      'Capas de validación puntúan tu idea frente a tendencias, comunidades y competencia cuando tú quieras.',
  },
  {
    icon: Layers,
    title: 'Listo para ficha',
    description:
      'Guarda título, resumen y estructura claros. Publica en el feed solo si lo deseas.',
  },
] as const

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const },
  },
}

type HomeFeaturesProps = {
  className?: string
}

export function HomeFeatures({ className }: HomeFeaturesProps) {
  return (
    <section
      className={cn('px-4 py-16 sm:px-6 sm:py-20', className)}
      aria-labelledby="home-features-heading"
    >
      <div className={APP_PAGE_WIDTH_CLASS}>
        <ScrollReveal>
          <h2
            id="home-features-heading"
            className="font-serif text-2xl text-foreground sm:text-3xl"
          >
            De la chispa caótica al <span className="text-primary">siguiente paso claro</span>
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Idealow te recibe donde aterriza la idea y te ayuda a estructurarla sin perder la energía
            original.
          </p>
        </ScrollReveal>

        <motion.ul
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-40px' }}
          className="mt-10 grid gap-4 sm:grid-cols-2"
        >
          {FEATURES.map(({ icon: Icon, title, description }, index) => (
            <motion.li key={title} variants={item}>
              <Card
                className={cn(
                  'h-full rounded-2xl border-border/80 shadow-sm transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-md',
                  index % 2 === 0
                    ? 'border-primary/15 bg-gradient-to-br from-card to-primary/[0.04]'
                    : 'border-amber-200/20 bg-gradient-to-br from-card to-amber-50/40 dark:border-amber-500/15 dark:to-amber-950/25',
                )}
              >
                <CardContent className="flex gap-4 p-6">
                  <div
                    className={cn(
                      'flex size-12 shrink-0 items-center justify-center rounded-full text-primary',
                      index % 2 === 0
                        ? 'bg-primary/12 ring-1 ring-primary/15'
                        : 'bg-amber-100/80 text-amber-900 ring-1 ring-amber-200/60 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-500/25',
                    )}
                    aria-hidden
                  >
                    <Icon className="size-6" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  )
}
