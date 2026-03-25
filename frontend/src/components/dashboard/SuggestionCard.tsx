import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

type Props = {
  prompt: string
  sector: string
  emoji: string
  onClick: () => void
  index: number
}

export function SuggestionCard({ prompt, sector, emoji, onClick, index }: Props) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      type="button"
      onClick={onClick}
      className="group text-left"
    >
      <Card className="rounded-2xl transition-all hover:border-primary/40 hover:shadow-md">
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <span className="text-2xl">{emoji}</span>
            <Badge className="capitalize">{sector}</Badge>
          </div>
          <p className="text-sm leading-relaxed text-foreground">{prompt}</p>
          <div className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            Usar como base
            <ArrowRight className="size-3" />
          </div>
        </CardContent>
      </Card>
    </motion.button>
  )
}
