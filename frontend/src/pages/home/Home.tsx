import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { HomeLandingHeader } from '@/components/home/HomeLandingHeader'
import { HomeHero } from '@/components/home/HomeHero'
import { HomeFeatures } from '@/components/home/HomeFeatures'
import { HomeFooter } from '@/components/home/HomeFooter'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function HomeCtaBand() {
  return (
    <section className="px-4 py-12 sm:px-6" aria-labelledby="home-cta-heading">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-24px' }}
        transition={{ duration: 0.4 }}
        className="mx-auto max-w-5xl"
      >
        <Card className="overflow-hidden rounded-3xl border-primary/20 bg-gradient-to-br from-primary/10 via-background to-amber-50/40">
          <CardContent className="flex flex-col items-start gap-6 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div>
              <h2
                id="home-cta-heading"
                className="font-serif text-2xl text-foreground sm:text-3xl"
              >
                Ready when you are
              </h2>
              <p className="mt-2 max-w-lg text-sm text-muted-foreground sm:text-base">
                Create an account in seconds. No credit card — just a calmer place to grow ideas.
              </p>
            </div>
            <Link
              to="/register"
              className={cn(buttonVariants({ size: 'lg' }), 'group shrink-0 gap-2')}
            >
              Create your workspace
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
    <div className="flex min-h-screen flex-col bg-background">
      <HomeLandingHeader />
      <main className="flex-1">
        <HomeHero />
        <HomeFeatures className="bg-muted/30" />
        <HomeCtaBand />
      </main>
      <HomeFooter />
    </div>
  )
}
