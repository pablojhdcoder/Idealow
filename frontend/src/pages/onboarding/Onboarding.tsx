import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, Loader2, Check } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { SectorPicker } from '@/components/onboarding/SectorPicker'
import { ExperienceCard } from '@/components/onboarding/ExperienceCard'
import { GoalCard } from '@/components/onboarding/GoalCard'
import { Button } from '@/components/ui/button'
import { appPageMainClassName } from '@/lib/appPageLayout'
import { Progress } from '@/components/ui/progress'
import { patchProfile, type PatchProfileBody } from '@/lib/api/users'
import { consumePostAuthReturn, sanitizePostAuthReturnPath } from '@/lib/postAuthRedirect'

export default function Onboarding() {
  const [step, setStep]             = useState(0)
  const [sectors, setSectors]       = useState<string[]>([])
  const [experience, setExperience] = useState('')
  const [goal, setGoal]             = useState('')
  const [saving, setSaving]         = useState(false)
  const [done, setDone]             = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const setUser = useAuthStore(s => s.setUser)
  const canContinue =
    (step === 0 && sectors.length > 0) ||
    (step === 1 && experience !== '') ||
    (step === 2 && goal !== '')

  const handleFinish = async () => {
    setSaving(true)
    try {
      const data = await patchProfile({
        sectors,
        experienceLevel: experience as NonNullable<PatchProfileBody['experienceLevel']>,
        goal: goal as NonNullable<PatchProfileBody['goal']>,
      })
      setUser({
        id: data.user.id,
        email: data.user.email,
        username: data.user.username,
        avatarUrl: data.user.avatarUrl ?? undefined,
        sectors: data.user.sectors,
        goal: data.user.goal,
      })
      setDone(true)
      const fromState = sanitizePostAuthReturnPath(
        (location.state as { from?: string } | null)?.from,
      )
      const fromStored = consumePostAuthReturn()
      const nextPath = fromStored ?? fromState ?? '/dashboard'
      setTimeout(() => navigate(nextPath), 1200)
    } catch {
      // Error al guardar: permanece en el paso para reintentar
    } finally {
      setSaving(false)
    }
  }

  const next = () => {
    if (step < 2) setStep(s => s + 1)
    else void handleFinish()
  }

  if (done) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 text-center"
        >
          <div className="flex size-20 items-center justify-center rounded-full bg-primary/10">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1, bounce: 0.5 }}>
              <Check className="size-10 text-primary" strokeWidth={3} />
            </motion.div>
          </div>
          <p className="font-serif text-2xl text-foreground">¡Listo!</p>
          <p className="text-sm text-muted-foreground">Preparando tu espacio…</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[60vh] flex-col bg-background">
      <Progress
        value={((step + 1) / 3) * 100}
        className="w-full [&>div]:rounded-none [&_[data-slot='progress-track']]:h-1 [&_[data-slot='progress-track']]:rounded-none"
      />

      <div className={appPageMainClassName('flex-1 py-10')}>
        <p className="mb-2 text-xs font-medium tracking-widest text-primary uppercase">
          Paso {step + 1} de 3
        </p>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
          >
            <h1 className="font-serif text-2xl text-foreground sm:text-3xl">
              {step === 0 && '¿En qué áreas centrarás tus ideas?'}
              {step === 1 && '¿Cómo describirías tu experiencia?'}
              {step === 2 && '¿Qué estás construyendo ahora?'}
            </h1>
            <p className="mb-6 mt-1.5 text-sm text-muted-foreground">
              {step === 0 && 'Elige hasta 5 sectores'}
              {step === 1 && 'Tu nivel como constructor'}
              {step === 2 && 'Tu objetivo principal'}
            </p>

            {step === 0 && <SectorPicker selected={sectors} onChange={setSectors} />}
            {step === 1 && <ExperienceCard value={experience} onChange={setExperience} />}
            {step === 2 && <GoalCard value={goal} onChange={setGoal} />}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-between">
          {step > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStep(s => s - 1)}
              className="h-10 rounded-full px-4 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
              Atrás
            </Button>
          ) : (
            <span />
          )}
          <Button
            type="button"
            disabled={!canContinue || saving}
            onClick={next}
            className="h-11 rounded-full px-6"
          >
            {step === 2 ? (saving ? <><Loader2 className="size-4 animate-spin" /> Guardando…</> : 'Finalizar') : 'Siguiente'}
            {step < 2 && <ChevronRight className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
