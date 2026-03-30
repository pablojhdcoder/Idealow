import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { HomeLandingHeader } from '@/components/home/HomeLandingHeader'
import { HomeHero } from '@/components/home/HomeHero'
import { HomeScrollAmbience } from '@/components/home/HomeScrollAmbience'
import { HomeWhatItDoes } from '@/components/home/HomeWhatItDoes'
import { HomeFeatures } from '@/components/home/HomeFeatures'
import { HomeRoadmap } from '@/components/home/HomeRoadmap'
import { HomeFaq } from '@/components/home/HomeFaq'
import { HomeFooter } from '@/components/home/HomeFooter'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { APP_PAGE_WIDTH_CLASS } from '@/lib/appPageLayout'

function HomeCtaBand() {
  return (
    <section className="px-4 py-12 sm:px-6" aria-labelledby="home-cta-heading">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-24px' }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
        className={APP_PAGE_WIDTH_CLASS}
      >
        <Card className="overflow-hidden rounded-3xl border-primary/35 bg-gradient-to-br from-primary/[0.18] via-background to-amber-50/60 shadow-md dark:from-primary/[0.22] dark:to-amber-950/30">
          <CardContent className="flex flex-col items-start gap-6 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div>
              <h2
                id="home-cta-heading"
                className="font-serif text-2xl text-foreground sm:text-3xl"
              >
                Cuando quieras, aquí estamos
              </h2>
              <p className="mt-2 max-w-lg text-sm text-muted-foreground sm:text-base">
                Crea una cuenta en segundos.
              </p>
            </div>
            <Link
              to="/register"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'group shrink-0 gap-2 font-semibold',
              )}
            >
              Crear tu espacio
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  )
}

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <HomeScrollAmbience />
      <HomeLandingHeader />
      <main className="relative z-10 flex-1">
        <HomeHero />
        {/* Sin fondo por sección: los gradientes por bloque chocaban y creaban costuras visibles. */}
        <HomeWhatItDoes />
        <HomeFeatures />
        <HomeRoadmap />
        <HomeFaq />
        <HomeCtaBand />
      </main>
      <HomeFooter className="relative z-10" />
    </div>
  )
}
