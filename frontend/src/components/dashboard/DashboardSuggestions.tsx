import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DASHBOARD_STARTERS_VISIBLE, pickRandomStarters } from '@/lib/dashboardSuggestions'
import { SuggestionCard } from './SuggestionCard'

export function DashboardSuggestions() {
  const navigate = useNavigate()
  const [visibleStarters] = useState(() => pickRandomStarters(DASHBOARD_STARTERS_VISIBLE))

  const handleUse = (starterId: string) => {
    const params = new URLSearchParams({ starter: starterId })
    navigate(`/ideas/new?${params.toString()}`)
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {visibleStarters.map((item, i) => (
        <SuggestionCard
          key={item.id}
          prompt={item.shortLine}
          sector={item.sector}
          emoji={item.emoji}
          index={i}
          onClick={() => handleUse(item.id)}
        />
      ))}
    </div>
  )
}
