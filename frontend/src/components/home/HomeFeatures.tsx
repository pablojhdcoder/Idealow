import { motion } from 'framer-motion'
import { Layers, Mic, Radar, Wand2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { APP_PAGE_WIDTH_CLASS } from '@/lib/appPageLayout'

const FEATURES = [
  {
    icon: Mic,
    title: 'Cualquier entrada',
    description:
      'Pega una nota, arrastra un archivo o graba audio. Lo unificamos en texto con el que puedes trabajar.',
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
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
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
        <h2
          id="home-features-heading"
          className="font-serif text-2xl text-foreground sm:text-3xl"
        >
          De la chispa caótica al siguiente paso claro
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Idealow te recibe donde aterriza la idea y te ayuda a estructurarla sin perder la energía
          original.
        </p>

        <motion.ul
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-40px' }}
          className="mt-10 grid gap-4 sm:grid-cols-2"
        >
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <motion.li key={title} variants={item}>
              <Card className="h-full rounded-2xl border-border/80 shadow-sm transition-shadow hover:shadow-md">
                <CardContent className="flex gap-4 p-6">
                  <div
                    className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
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
