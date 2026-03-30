import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-md shadow-primary/25 ring-1 ring-inset ring-white/15 hover:bg-primary/92 hover:shadow-lg hover:shadow-primary/30 dark:ring-white/10 dark:hover:bg-primary/88',
        outline:
          'border-2 border-border/90 bg-background/95 text-foreground shadow-sm backdrop-blur-sm hover:border-primary/35 hover:bg-primary/[0.06] hover:text-foreground hover:shadow-md dark:border-border dark:bg-background/80 dark:hover:border-primary/30 dark:hover:bg-primary/[0.1]',
        ghost:
          'text-foreground hover:bg-muted/90 hover:shadow-sm active:bg-muted',
        destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
      },
      size: {
        default: 'h-11 px-5',
        sm: 'h-9 px-4 text-xs',
        lg: 'h-12 px-7 text-[15px]',
        icon: 'size-10 rounded-full p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

export { buttonVariants }
