import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { ScrollReveal } from '@/components/ui/scroll-reveal'
import { cn } from '@/lib/utils'
import { APP_PAGE_WIDTH_CLASS } from '@/lib/appPageLayout'

const FAQ_ITEMS = [
  {
    q: '¿Idealow es gratis para empezar?',
    a: 'Sí. Puedes crear cuenta y usar el flujo principal sin ningún tipo de pago. El objetivo es que pruebes el flujo de captura, refinamiento y validación con calma.',
  },
  {
    q: '¿Qué es el feed comunitario o comunidad?',
    a: 'Es un espacio donde los usuarios pueden votar y comentar sobre las ideas que han sido publicadas. Es opcional y solo se mostrarán las ideas que hayas marcado como públicas.',
  },
  {
    q: '¿Mis ideas se publican solas en la comunidad?',
    a: 'No. Tú decides si una idea es privada o apta para el feed. La visibilidad comunitaria es una opción explícita, no un valor por defecto obligatorio.',
  },
  {
    q: '¿Qué incluye la validación de mercado?',
    a: 'Combinamos señales públicas (por ejemplo comunidades, noticias y vídeos) con síntesis y estimaciones asistidas por IA. No sustituye un estudio profesional, pero te da un pulso orientativo rápido.',
  },
  {
    q: '¿Qué datos se envían a la IA?',
    a: 'El contenido que aportas para refinar o validar una idea (texto, metadatos derivados de archivos que subes, etc.), para generar títulos, resúmenes, puntuaciones y textos de apoyo. Revisa siempre la información sensible antes de enviarla.',
  },
  {
    q: '¿Puedo usar Idealow solo para guardar mis ideas y no participar en la comunidad?',
    a: 'Sí. Puedes usar la app solo para ti. Puedes marcar en el perfil que todas tus ideas sean privadas y ninguna idea se publicará en el feed. Nadie podrá votar ni comentar. ',
  },
] as const

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.08 },
  },
}

const item = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
  },
}

type HomeFaqProps = {
  className?: string
}

export function HomeFaq({ className }: HomeFaqProps) {
  return (
    <section
      id="preguntas-frecuentes"
      className={cn('scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20', className)}
      aria-labelledby="home-faq-heading"
    >
      <div className={APP_PAGE_WIDTH_CLASS}>
        <ScrollReveal>
          <h2
            id="home-faq-heading"
            className="font-serif text-2xl text-foreground sm:text-3xl"
          >
            Preguntas <span className="text-primary">frecuentes</span>
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Respuestas directas sobre privacidad, validación y cómo encaja Idealow en tu día a día.
          </p>
        </ScrollReveal>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-32px' }}
          className="mt-10 space-y-3"
        >
          {FAQ_ITEMS.map(({ q, a }) => (
            <motion.div key={q} variants={item}>
              <details
                className={cn(
                  'group rounded-2xl border border-border/80 bg-card shadow-sm transition-[box-shadow,border-color]',
                  'open:border-primary/20 open:shadow-md',
                  '[&_summary::-webkit-details-marker]:hidden',
                )}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:px-6 sm:py-4">
                  <span className="font-medium text-foreground">{q}</span>
                  <ChevronDown
                    className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <div className="border-t border-border/60 px-5 pb-5 pt-3 sm:px-6 sm:pb-6">
                  <p className="text-sm leading-relaxed text-muted-foreground">{a}</p>
                </div>
              </details>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
