import { motion } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'

export function WizardSkeleton() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      role="status"
      aria-label="Cargando asistente de refinamiento"
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card mx-4 w-full max-w-lg rounded-3xl border border-border p-8 shadow-2xl"
      >
        <div className="mb-8 flex gap-1.5">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-1.5 flex-1 rounded-full" />
          ))}
        </div>
        <Skeleton className="mb-2 h-4 w-3/4 rounded-md" />
        <Skeleton className="mb-6 h-8 w-full rounded-md" />
        <div className="mb-8 grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-16 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>
      </motion.div>
    </div>
  )
}
