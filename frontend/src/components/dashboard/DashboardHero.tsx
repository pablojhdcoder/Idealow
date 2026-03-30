import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  name: string
}

export function DashboardHero({ name }: Props) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-3xl border border-primary/15',
        'bg-gradient-to-br from-primary/[0.09] via-background to-amber-500/[0.06]',
        'px-5 py-7 shadow-sm sm:px-8 sm:py-9',
      )}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-wrap items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
          <Sparkles className="size-6" strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-widest text-primary/80">Dashboard</p>
          <h1 className="mt-1 font-serif text-3xl tracking-tight text-foreground sm:text-4xl">
            Hola, {name} 👋
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Empieza una nueva idea, retoma las tuyas y descubre lo que se está moviendo en la comunidad de Idealow.
          </p>
        </div>
      </div>
    </section>
  )
}
