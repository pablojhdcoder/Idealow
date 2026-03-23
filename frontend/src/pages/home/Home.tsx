import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16 bg-background">
      <div className="mx-auto max-w-lg text-center">
        <p className="font-serif text-4xl tracking-tight text-foreground sm:text-5xl">
          Idealow
        </p>
        <p className="mt-4 text-muted-foreground">
          Capture ideas, validate with real sources and share them as beautiful flashcards.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link to="/register" className={buttonVariants()}>
            New idea
          </Link>
          <Link to="/login" className={buttonVariants({ variant: 'outline' })}>
            Explore
          </Link>
        </div>
      </div>
    </div>
  )
}
