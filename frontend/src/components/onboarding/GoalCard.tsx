import { motion } from 'framer-motion'

type Option = { id: string; emoji: string; label: string; desc: string }

const options: Option[] = [
  { id: 'HACKATHON', emoji: '⚡', label: 'Hackatón', desc: 'Necesito una idea rápido (en horas/días)' },
  { id: 'SIDE_PROJECT', emoji: '🌱', label: 'Proyecto paralelo', desc: 'Algo para construir los fines de semana' },
  { id: 'STARTUP', emoji: '🚀', label: 'Empresa emergente', desc: 'Quiero construir un negocio real' },
  { id: 'LEARNING', emoji: '📖', label: 'Aprendizaje', desc: 'Explorar y experimentar' },
]

type Props = { value: string; onChange: (value: string) => void }

export function GoalCard({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {options.map((opt, i) => {
        const isSelected = value === opt.id
        return (
          <motion.button
            key={opt.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => onChange(opt.id)}
            className={[
              'flex items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-all',
              isSelected
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-border bg-card hover:border-primary/40 hover:bg-primary/5',
            ].join(' ')}
          >
            <span className="shrink-0 text-3xl">{opt.emoji}</span>
            <div>
              <p className={`text-sm font-semibold ${isSelected ? 'text-primary' : 'text-foreground'}`}>{opt.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{opt.desc}</p>
            </div>
            <div className={`ml-auto size-4 shrink-0 rounded-full border-2 transition-colors ${isSelected ? 'border-primary bg-primary' : 'border-border'}`} />
          </motion.button>
        )
      })}
    </div>
  )
}
