import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import AppShellHeader from '@/components/layout/AppShellHeader'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

export default function NewIdea() {
  const location = useLocation()
  const backTo =
    location.state && typeof location.state === 'object' && 'from' in location.state
      ? String((location.state as { from?: string }).from || '/dashboard')
      : '/dashboard'

  return (
    <div className="min-h-screen bg-background">
      <AppShellHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          to={backTo}
          className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Back to ideas"
        >
          <ArrowLeft className="size-4" />
        </Link>

        <Card className="mt-4 p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Plus className="size-5" />
            </div>
            <div>
              <h1 className="font-serif text-2xl text-foreground">Capture new idea</h1>
              <p className="text-sm text-muted-foreground">
                Paste text, URL, or upload media. Keep it simple.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <Textarea
              className="min-h-32"
              placeholder="Write your raw idea..."
            />
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="h-10">
                Attach file
              </Button>
              <Button className="h-10">
                Continue
              </Button>
            </div>
          </div>
        </Card>
      </main>
    </div>
  )
}
