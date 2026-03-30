import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const tagVariants = cva(
  'inline-flex items-center rounded-full border border-current/25 font-semibold',
  {
    variants: {
      size: {
        xs: 'px-2.5 py-0.5 text-[10px]',
        sm: 'px-2.5 py-0.5 text-[11px]',
        md: 'px-3 py-1 text-xs',
      },
    },
    defaultVariants: {
      size: 'sm',
    },
  },
)

export type TagProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof tagVariants>

export function Tag({ className, size, ...props }: TagProps) {
  return <span className={cn(tagVariants({ size }), className)} {...props} />
}

