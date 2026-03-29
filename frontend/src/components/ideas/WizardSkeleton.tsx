import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

/** Contenedor scroll-safe compartido con RefinementWizard (evita desbordes en viewport bajo / móvil). */
export const wizardModalOverlayClass =
  'fixed inset-0 z-50 overflow-y-auto overflow-x-hidden overscroll-contain bg-black/30 backdrop-blur-sm'

export const wizardModalCenterClass =
  'flex min-h-full w-full items-center justify-center p-4 py-6 sm:p-6 sm:py-10 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-[max(1.25rem,env(safe-area-inset-top,0px))]'

/**
 * Carga del asistente: compacto (sin clonar el layout completo del wizard) para no superar el viewport.
 */
export function WizardSkeleton() {
  return (
    <div
      className={wizardModalOverlayClass}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Cargando asistente de refinamiento"
    >
      <div className={wizardModalCenterClass}>
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="bg-card w-full max-w-lg shrink-0 rounded-3xl border border-border px-5 py-7 shadow-2xl sm:px-7 sm:py-8"
        >
          <div className="flex flex-col items-center text-center">
            <motion.div
              className="relative flex size-10 items-center justify-center sm:size-11"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.04, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.span
                className="absolute inset-0 rounded-full border-2 border-primary/20"
                animate={{ scale: [1, 1.35], opacity: [0.4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                aria-hidden
              />
              <Loader2 className="size-7 animate-spin text-primary sm:size-8" strokeWidth={2} aria-hidden />
            </motion.div>

            <h2 className="font-serif mt-5 text-lg tracking-tight text-foreground sm:text-xl">
              Preparando tu asistente
            </h2>
            <p className="text-muted-foreground mt-2 max-w-[280px] text-xs leading-relaxed sm:max-w-sm sm:text-sm">
              Generando preguntas personalizadas…
            </p>

            <div className="mt-5 flex w-full gap-1.5 sm:mt-6">
              {[1, 2, 3, 4, 5].map(i => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0.35 }}
                  animate={{ opacity: [0.35, 0.7, 0.35] }}
                  transition={{
                    duration: 1.3,
                    repeat: Infinity,
                    delay: i * 0.1,
                    ease: 'easeInOut',
                  }}
                  className="flex-1"
                >
                  <Skeleton className="h-1 rounded-full" />
                </motion.div>
              ))}
            </div>

            <div className="mt-5 w-full space-y-2 sm:mt-6">
              <Skeleton className="mx-auto h-2.5 w-[88%] rounded-full" />
              <Skeleton className="mx-auto h-2.5 w-[72%] rounded-full opacity-80" />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
