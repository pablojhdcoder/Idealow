import * as React from 'react'
import { Dialog as SheetPrimitive } from '@base-ui/react/dialog'
import { XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function Sheet(props: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root {...props} />
}

export function SheetTrigger(props: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger {...props} />
}

export function SheetClose(props: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close {...props} />
}

export function SheetContent({
  className,
  children,
  side = 'right',
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & { side?: 'top' | 'right' | 'bottom' | 'left'; showCloseButton?: boolean }) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/10 supports-backdrop-filter:backdrop-blur-xs" />
      <SheetPrimitive.Popup
        data-side={side}
        className={cn(
          'fixed z-50 bg-card shadow-lg border-border',
          side === 'right' && 'inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm',
          side === 'left' && 'inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm',
          side === 'top' && 'inset-x-0 top-0 border-b',
          side === 'bottom' && 'inset-x-0 bottom-0 border-t',
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close render={<Button variant="ghost" size="icon" className="absolute right-2 top-2" />}>
            <XIcon />
            <span className="sr-only">Cerrar</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPrimitive.Portal>
  )
}

export function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1.5 p-4', className)} {...props} />
}

export function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return <SheetPrimitive.Title className={cn('font-serif text-xl text-foreground', className)} {...props} />
}

export function SheetDescription({ className, ...props }: SheetPrimitive.Description.Props) {
  return <SheetPrimitive.Description className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('mt-auto flex flex-col gap-2 p-4', className)} {...props} />
}
