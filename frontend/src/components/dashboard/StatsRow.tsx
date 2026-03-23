import { Card, CardContent } from '@/components/ui/card'

type Stat = {
  label: string
  value: string
}

type Props = {
  stats: Stat[]
}

export function StatsRow({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map(stat => (
        <Card key={stat.label} className="rounded-2xl">
          <CardContent className="px-4 py-3">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="mt-1 font-serif text-xl text-foreground">{stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
