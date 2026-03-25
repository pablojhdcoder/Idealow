/**
 * Ejemplos del dashboard (sin fetch a IA). Pool de 9; en cada visita se muestran 3 al azar.
 * Alineados con STATIC_IDEA_SUGGESTIONS en backend.
 */
export type DashboardStarter = {
  id: string
  /** Una línea: núcleo de la idea (breve). */
  shortLine: string
  sector: string
  emoji: string
}

/** Total de ideas de ejemplo en catálogo. */
export const DASHBOARD_STARTER_POOL_SIZE = 9

/** Cuántas tarjetas se muestran en el grid del dashboard. */
export const DASHBOARD_STARTERS_VISIBLE = 3

export const DASHBOARD_STARTERS: readonly DashboardStarter[] = [
  {
    id: 'creators-time',
    shortLine: 'Herramienta que ahorra a creadores al menos 1 hora al día en tareas repetitivas.',
    sector: 'productivity',
    emoji: '⚡',
  },
  {
    id: 'local-experts',
    shortLine: 'Marketplace local que conecta expertos con personas cercanas que buscan ayuda.',
    sector: 'other',
    emoji: '🌟',
  },
  {
    id: 'language-consistency',
    shortLine: 'App de idiomas donde la constancia desbloquea funciones premium.',
    sector: 'education',
    emoji: '📚',
  },
  {
    id: 'habits-micro',
    shortLine: 'Seguimiento de hábitos con micro-recompensas y recordatorios discretos.',
    sector: 'health',
    emoji: '🎯',
  },
  {
    id: 'freelancer-hub',
    shortLine: 'Panel simple para freelancers que unifica facturas, clientes y recordatorios.',
    sector: 'finance',
    emoji: '📋',
  },
  {
    id: 'travel-offline',
    shortLine: 'Guías de viaje descargables que funcionan sin conexión en el móvil.',
    sector: 'travel',
    emoji: '✈️',
  },
  {
    id: 'food-expiry',
    shortLine: 'App que sugiere recetas según lo que caduca pronto en tu nevera.',
    sector: 'food',
    emoji: '🥗',
  },
  {
    id: 'sports-amateur',
    shortLine: 'Red social ligera para organizar partidos amateur por barrio o nivel.',
    sector: 'sports',
    emoji: '⚽',
  },
  {
    id: 'events-niche',
    shortLine: 'Agregador de eventos culturales poco conocidos con alertas por intereses.',
    sector: 'entertainment',
    emoji: '🎭',
  },
]

export function getDashboardStarterById(id: string): DashboardStarter | undefined {
  return DASHBOARD_STARTERS.find(s => s.id === id)
}

/**
 * Elige `count` starters distintos al azar (sin repetir). Útil al montar el dashboard.
 */
export function pickRandomStarters(count: number): DashboardStarter[] {
  const pool = [...DASHBOARD_STARTERS]
  const n = Math.min(Math.max(0, Math.floor(count)), pool.length)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = pool[i]!
    pool[i] = pool[j]!
    pool[j] = t
  }
  return pool.slice(0, n)
}

/**
 * Texto inyectado en "Capturar idea": base concreta + espacio explícito para que el usuario complete.
 */
export function buildNewIdeaStarterContent(ideaBaseLine: string): string {
  const line = ideaBaseLine.trim()
  return `Idea base: ${line}

Añade lo que quieras: contexto, público, restricciones o cambios.`
}
