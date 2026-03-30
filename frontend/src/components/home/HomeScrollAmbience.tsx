import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'

/**
 * Capa fija detrás del contenido: halos con parallax al hacer scroll.
 * Colores desde tokens (primary / ámbar) con opacidades un poco más marcadas en la landing.
 */
export function HomeScrollAmbience() {
  const reduce = useReducedMotion()
  const { scrollY } = useScroll()

  const yA = useTransform(scrollY, [0, 1200], [0, reduce ? 0 : 160])
  const yB = useTransform(scrollY, [0, 1200], [0, reduce ? 0 : -120])
  const yC = useTransform(scrollY, [0, 800], [0, reduce ? 0 : 80])
  const washOpacity = useTransform(scrollY, [0, 400, 900], [0.12, 0.2, 0.1])

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      {/* Halo superior izquierdo — violeta */}
      <motion.div
        style={{ y: yA }}
        className="absolute -left-40 top-[-8%] size-[min(110vw,480px)] rounded-full bg-primary/22 blur-3xl dark:bg-primary/28"
      />
      {/* Halo derecho — cálido */}
      <motion.div
        style={{ y: yB }}
        className="absolute -right-28 top-[18%] size-[min(95vw,400px)] rounded-full bg-amber-400/28 blur-3xl dark:bg-amber-400/18"
      />
      {/* Halo inferior — refuerzo primary */}
      <motion.div
        style={{ y: yC }}
        className="absolute bottom-[-5%] left-[20%] size-[min(100vw,420px)] rounded-full bg-primary/16 blur-3xl dark:bg-primary/20"
      />
      {/* Brillo central que respira con el scroll */}
      <motion.div
        style={{ opacity: washOpacity }}
        className="absolute inset-x-0 top-[38%] mx-auto h-[min(75vh,560px)] max-w-4xl rounded-[100%] bg-primary/14 blur-3xl dark:bg-primary/18"
      />
      {/* Luz superior muy difusa */}
      <div className="absolute inset-x-0 top-0 h-[min(70vh,520px)] bg-gradient-to-b from-primary/[0.1] via-primary/[0.04] to-transparent blur-3xl dark:from-primary/[0.12] dark:via-primary/[0.05]" />
    </div>
  )
}
