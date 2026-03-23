import { useNavigate } from 'react-router-dom'
import { SuggestionCard } from './SuggestionCard'

const mockSuggestions = [
  {
    prompt: 'What if you build a tool that saves creators 1 hour per day?',
    sector: 'productivity',
    emoji: '⚡',
  },
  {
    prompt: 'A curated marketplace to connect local experts with people nearby.',
    sector: 'other',
    emoji: '🌟',
  },
  {
    prompt: 'Language practice app where consistency unlocks premium features.',
    sector: 'education',
    emoji: '📚',
  },
]

export function DashboardSuggestions() {
  const navigate = useNavigate()

  const handleUse = (prompt: string) => {
    const params = new URLSearchParams({ prompt })
    navigate(`/ideas/new?${params.toString()}`)
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {mockSuggestions.map((item, i) => (
        <SuggestionCard
          key={`${item.sector}-${i}-${item.prompt.slice(0, 24)}`}
          {...item}
          index={i}
          onClick={handleUse}
        />
      ))}
    </div>
  )
}
