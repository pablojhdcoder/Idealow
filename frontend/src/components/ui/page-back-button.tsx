import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type PageBackButtonProps = {
  label?: string
  to?: string
  state?: unknown
  onClick?: () => void
  className?: string
  icon?: ReactNode
}

const BASE_CLASS =
  'inline-flex h-10 items-center gap-2 rounded-full border-border/70 bg-background/65 px-3 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary'

export function PageBackButton({
  label = 'Volver',
  to,
  state,
  onClick,
  className,
  icon,
}: PageBackButtonProps) {
  const content = (
    <>
      {icon ?? <ArrowLeft className="size-3.5" aria-hidden />}
      {label}
    </>
  )

  if (onClick) {
    return (
      <Button
        type="button"
        variant="outline"
        className={cn(BASE_CLASS, className)}
        onClick={onClick}
      >
        {content}
      </Button>
    )
  }

  return (
    <Link
      to={to ?? '/dashboard'}
      state={state}
      className={cn(buttonVariants({ variant: 'outline' }), BASE_CLASS, className)}
      aria-label={label}
    >
      {content}
    </Link>
  )
}

