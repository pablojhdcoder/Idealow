import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

type ScrollRevealProps = HTMLMotionProps<'div'> & {
  /** Retraso en segundos respecto a la entrada en viewport. */
  delay?: number
}

export function ScrollReveal({ children, className, delay = 0, ...props }: ScrollRevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-48px' }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.22, 1, 0.36, 1] as const,
      }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  )
}
