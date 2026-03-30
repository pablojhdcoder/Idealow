import { motion } from 'framer-motion'
import { ArrowDown, FileStack, Globe2, LayoutGrid, Sparkles, Target } from 'lucide-react'
import { ScrollReveal } from '@/components/ui/scroll-reveal'
import { cn } from '@/lib/utils'
import { APP_PAGE_WIDTH_CLASS } from '@/lib/appPageLayout'

const STEPS = [
  {
    icon: FileStack,
    title: 'Captura en bruto',
    description:
      'Texto, audio, imagen, vídeo o PDF: unificamos todo en algo con el que puedas trabajar.',
  },
  {
    icon: Sparkles,
    title: 'Refinamiento guiado',
    description:
      'Un wizard breve afila título, resumen y estructura para que la idea sea clara y accionable.',
  },
  {
    icon: Target,
    title: 'Validación de mercado',
    description:
      'Contrastamos tu idea con señales reales (comunidades, noticias, vídeo) y contexto sintetizado por IA.',
  },
  {
    icon: LayoutGrid,
    title: 'Ficha lista',
    description:
      'Obtienes una flashcard con puntuación de validación y contenido ordenado para iterar o presentar.',
  },
  {
    icon: Globe2,
    title: 'Comunidad opcional',
    description:
      'Publicas en el feed solo si quieres. Las ideas pueden publicarse para ser validadas en nuestra comunidad.',
  },
] as const

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.08 },
  },
}

const item = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
  },
}

type HomeWhatItDoesProps = {
  className?: string
}

export function HomeWhatItDoes({ className }: HomeWhatItDoesProps) {
  return (
    <section
      id="que-hace"
      className={cn('scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20', className)}
      aria-labelledby="home-what-heading"
    >
      <div className={APP_PAGE_WIDTH_CLASS}>
        <ScrollReveal>
          <h2
            id="home-what-heading"
            className="font-serif text-2xl text-foreground sm:text-3xl"
          >
            Qué hace <span className="text-primary">Idealow</span>
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Un solo recorrido: de la captura caótica a una idea con contexto, sin perder el control de
            lo que compartes.
          </p>
        </ScrollReveal>

        <motion.ol
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-36px' }}
          className="mt-12"
        >
          {STEPS.map(({ icon: Icon, title, description }, index) => {
            const isLast = index === STEPS.length - 1
            return (
              <motion.li key={title} variants={item}>
                <div className="flex gap-4 sm:gap-6">
                  <div className="flex w-10 shrink-0 flex-col items-center self-stretch">
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-gradient-to-br from-primary/15 to-primary/5 text-primary shadow-sm ring-1 ring-primary/10"
                      aria-hidden
                    >
                      <Icon className="size-5" strokeWidth={2} />
                    </div>
                    {!isLast ? (
                      <div className="flex min-h-0 w-full flex-1 flex-col items-center">
                        {/* Línea centrada en el hueco bajo el icono = centrada entre este círculo y el siguiente */}
                        <div className="hidden w-full flex-1 flex-col items-center justify-center sm:flex">
                          <div className="flex min-h-0 w-full flex-1 flex-col items-center">
                            <div className="min-h-[2px] flex-1" aria-hidden />
                            <div className="w-px shrink-0 bg-border min-h-[7rem] sm:min-h-[9rem]" />
                            <div className="min-h-[2px] flex-1" aria-hidden />
                          </div>
                        </div>
                        <div className="flex flex-1 flex-col items-center justify-center py-2 sm:hidden">
                          <ArrowDown className="size-4 text-muted-foreground/60" aria-hidden />
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className={cn('min-w-0 flex-1', !isLast && 'pb-6 sm:pb-8')}>
                    <h3 className="font-semibold text-foreground">{title}</h3>
                    <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                      {description}
                    </p>
                  </div>
                </div>
              </motion.li>
            )
          })}
        </motion.ol>
      </div>
    </section>
  )
}
