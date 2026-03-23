import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'
import { cn } from '@/lib/utils'

export function Tabs(props: TabsPrimitive.Root.Props) {
  return <TabsPrimitive.Root className="flex flex-col gap-3" {...props} />
}

export function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      className={cn('inline-flex w-fit items-center gap-1 rounded-full bg-muted p-1', className)}
      {...props}
    />
  )
}

export function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      className={cn(
        'rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors data-active:bg-card data-active:text-foreground',
        className,
      )}
      {...props}
    />
  )
}

export function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return <TabsPrimitive.Panel className={cn('text-sm outline-none', className)} {...props} />
}
