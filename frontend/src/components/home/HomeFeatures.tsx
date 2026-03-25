import { motion } from 'framer-motion'
import { Layers, Mic, Radar, Wand2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const FEATURES = [
  {
    icon: Mic,
    title: 'Any input',
    description:
      'Paste a note, drop a file, or record audio. We normalize it into text you can work with.',
  },
  {
    icon: Wand2,
    title: 'Guided refinement',
    description:
      'A short wizard helps you sharpen the idea so it’s actionable instead of vague.',
  },
  {
    icon: Radar,
    title: 'Reality check',
    description:
      'Validation layers score your idea against trends, communities, and competition — when you’re ready.',
  },
  {
    icon: Layers,
    title: 'Flashcard-ready',
    description:
      'Save a clean title, summary, and structure. Publish to a community feed only if you want to.',
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
      <div className="mx-auto max-w-5xl">
        <h2
          id="home-features-heading"
          className="font-serif text-2xl text-foreground sm:text-3xl"
        >
          Built for messy sparks → clear next steps
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Idealow meets you where the idea lands, then helps you structure it without losing the
          original energy.
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
