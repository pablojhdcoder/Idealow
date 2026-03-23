import { motion } from 'framer-motion'

type Sector = {
  id: string
  emoji: string
  name: string
  desc: string
}

const sectors: Sector[] = [
  { id: 'tech', emoji: '💻', name: 'Tech & Software', desc: 'Apps, tools, platforms' },
  { id: 'health', emoji: '🏥', name: 'Health & Wellness', desc: 'Fitness and mental health' },
  { id: 'finance', emoji: '💰', name: 'Finance', desc: 'Fintech, saving, investing' },
  { id: 'education', emoji: '📚', name: 'Education', desc: 'Learning and skills' },
  { id: 'travel', emoji: '✈️', name: 'Travel', desc: 'Tourism and experiences' },
  { id: 'food', emoji: '🍕', name: 'Food', desc: 'Restaurants and delivery' },
  { id: 'sports', emoji: '⚽', name: 'Sports & Gaming', desc: 'Fitness, teams, esports' },
  { id: 'entertainment', emoji: '🎬', name: 'Entertainment', desc: 'Media, music, events' },
  { id: 'productivity', emoji: '⚡', name: 'Productivity', desc: 'Workflows and automation' },
  { id: 'other', emoji: '🌟', name: 'Other / Mixed', desc: 'Anything goes' },
]

type Props = {
  selected: string[]
  onChange: (selected: string[]) => void
}

export function SectorPicker({ selected, onChange }: Props) {
  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter(s => s !== id))
    else if (selected.length < 5) onChange([...selected, id])
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {sectors.map((sector, i) => {
        const isSelected = selected.includes(sector.id)
        const isDisabled = !isSelected && selected.length >= 5
        return (
          <motion.button
            key={sector.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => toggle(sector.id)}
            disabled={isDisabled}
            className={[
              'flex flex-col gap-1.5 rounded-2xl border px-4 py-3.5 text-left transition-all',
              isSelected
                ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20'
                : 'border-border bg-card hover:border-primary/40 hover:bg-primary/5',
              isDisabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
            ].join(' ')}
          >
            <span className="text-2xl leading-none">{sector.emoji}</span>
            <span className={`text-sm font-semibold ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>
              {sector.name}
            </span>
            <span className={`text-xs leading-snug ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
              {sector.desc}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}
