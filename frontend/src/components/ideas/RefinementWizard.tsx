import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import type { RefinementQuestion } from '@/types/idea'
import { ApiError } from '@/lib/api/client'
import { requestRefineQuestions, submitRefineAnswers } from '@/lib/api/ideas'
import {
  WizardSkeleton,
  wizardModalCenterClass,
  wizardModalOverlayClass,
} from '@/components/ideas/WizardSkeleton'
import { cn } from '@/lib/utils'

type Entry =
  | { kind: 'option'; optionId: string }
  | { kind: 'custom'; text: string }

function buildAnswerText(q: RefinementQuestion, entry: Entry): string {
  if (entry.kind === 'custom') {
    return entry.text.trim()
  }
  const opt = q.options.find(o => o.id === entry.optionId)
  return opt?.label ?? entry.optionId
}

export function RefinementWizard({
  ideaId,
  onComplete,
  onDismiss,
}: {
  ideaId: string
  onComplete: (ideaId: string) => void
  onDismiss?: () => void
}) {
  const [step, setStep] = useState(0)
  const [entries, setEntries] = useState<Record<string, Entry>>({})
  /** Tras guardar OK: pantalla de transición antes de navegar a validación. */
  const [validationHandoff, setValidationHandoff] = useState(false)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['refine-questions', ideaId],
    queryFn: () => requestRefineQuestions(ideaId),
  })

  const questions = data?.questions ?? []
  const current = questions[step]
  const currentEntry = current ? entries[current.id] : undefined

  const canContinue = useMemo(() => {
    if (!current || !currentEntry) return false
    if (currentEntry.kind === 'custom') {
      return currentEntry.text.trim().length > 0
    }
    return true
  }, [current, currentEntry])

  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = questions.map(q => {
        const e = entries[q.id]
        if (!e) return null
        return { questionId: q.id, answer: buildAnswerText(q, e) }
      })
      const answers = payload.filter((a): a is { questionId: string; answer: string } => a != null)
      if (answers.length !== questions.length) {
        throw new Error('Faltan respuestas')
      }
      return submitRefineAnswers(ideaId, answers)
    },
    onSuccess: () => {
      toast.success('Idea refinada', {
        description: 'Iniciando validación de mercado…',
      })
      setValidationHandoff(true)
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        toast.error(err.message)
        return
      }
      toast.error('No se pudieron guardar las respuestas')
    },
  })

  const selectOption = useCallback((q: RefinementQuestion, optionId: string) => {
    if (optionId === 'custom') {
      setEntries(prev => {
        const prevEntry = prev[q.id]
        const keepText = prevEntry?.kind === 'custom' ? prevEntry.text : ''
        return { ...prev, [q.id]: { kind: 'custom', text: keepText } }
      })
      return
    }
    setEntries(prev => ({ ...prev, [q.id]: { kind: 'option', optionId } }))
  }, [])

  const setCustomText = useCallback((questionId: string, text: string) => {
    setEntries(prev => ({ ...prev, [questionId]: { kind: 'custom', text } }))
  }, [])

  const handleNext = useCallback(() => {
    if (!canContinue || questions.length === 0) return
    if (step < questions.length - 1) {
      setStep(s => s + 1)
    } else {
      submitMutation.mutate()
    }
  }, [canContinue, questions.length, step, submitMutation])

  const handleBack = useCallback(() => {
    setStep(s => Math.max(0, s - 1))
  }, [])

  useEffect(() => {
    if (!validationHandoff) return
    const t = window.setTimeout(() => {
      onComplete(ideaId)
    }, 1100)
    return () => window.clearTimeout(t)
  }, [validationHandoff, ideaId, onComplete])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!current || submitMutation.isPending || validationHandoff) return
      if (e.key === 'Enter' && canContinue) {
        e.preventDefault()
        handleNext()
        return
      }
      const n = Number(e.key)
      if (n >= 1 && n <= 4 && current.options[n - 1]) {
        e.preventDefault()
        selectOption(current, current.options[n - 1]!.id)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [current, canContinue, handleNext, selectOption, submitMutation.isPending, validationHandoff])

  if (isLoading) {
    return <WizardSkeleton />
  }

  if (isError) {
    return (
      <div className={wizardModalOverlayClass}>
        <div className={wizardModalCenterClass}>
          <div className="bg-card w-full max-w-lg shrink-0 rounded-3xl border border-border p-6 shadow-2xl sm:p-8">
            <p className="text-sm text-destructive">
              {error instanceof ApiError ? error.message : 'No se pudieron cargar las preguntas'}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="text-sm text-muted-foreground underline"
                onClick={() => void refetch()}
              >
                Reintentar
              </button>
              {onDismiss && (
                <button type="button" className="text-sm font-medium text-primary" onClick={onDismiss}>
                  Cerrar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!current) {
    return null
  }

  const showPostSubmit = submitMutation.isPending || validationHandoff

  if (showPostSubmit) {
    const phaseSaving = submitMutation.isPending
    return (
      <div
        className={wizardModalOverlayClass}
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={phaseSaving ? 'Guardando respuestas' : 'Iniciando validación de mercado'}
      >
        <div className={wizardModalCenterClass}>
          <AnimatePresence mode="wait">
            <motion.div
              key={phaseSaving ? 'saving' : 'handoff'}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="bg-card relative w-full max-w-lg shrink-0 overflow-hidden rounded-3xl border border-border px-6 py-9 text-center shadow-2xl sm:px-8 sm:py-10"
            >
            <div
              className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/[0.06] via-transparent to-accent/[0.05]"
              aria-hidden
            />
            <div className="relative mx-auto flex max-w-sm flex-col items-center">
              {phaseSaving ? (
                <div className="relative flex size-16 items-center justify-center">
                  <motion.span
                    className="absolute inset-0 rounded-full border-2 border-primary/20"
                    animate={{ scale: [1, 1.4], opacity: [0.45, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                    aria-hidden
                  />
                  <Loader2 className="size-10 animate-spin text-primary" strokeWidth={2} aria-hidden />
                </div>
              ) : (
                <motion.div
                  className="flex size-16 items-center justify-center rounded-2xl border border-primary/15 bg-primary/[0.08]"
                  initial={{ scale: 0.88, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                >
                  <motion.div
                    animate={{ rotate: [0, 8, -8, 0] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Sparkles className="size-8 text-primary" aria-hidden />
                  </motion.div>
                </motion.div>
              )}
              <h2 className="font-serif text-foreground mt-8 text-xl tracking-tight sm:text-2xl">
                {phaseSaving ? 'Guardando tus respuestas' : 'Validación en marcha'}
              </h2>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                {phaseSaving
                  ? 'Un momento mientras aplicamos el refinamiento a tu idea…'
                  : 'El servidor está generando el informe de mercado. Te llevamos a la pantalla de resultados en segundos.'}
              </p>
              {!phaseSaving ? (
                <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
                  Si elegiste compartirla con la comunidad al crear la idea, pasará al feed público al completarse la
                  validación (puedes cambiarlo después en la ficha).
                </p>
              ) : null}
            </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    )
  }

  return (
    <div className={wizardModalOverlayClass}>
      <div className={wizardModalCenterClass}>
        <div className="bg-card max-h-[min(90dvh,52rem)] w-full max-w-lg shrink-0 overflow-y-auto overscroll-contain rounded-3xl border border-border p-6 shadow-2xl sm:p-8">
        <div className="mb-8 flex gap-1.5">
          {questions.map((_, i) => (
            <div
              key={`refine-step-${i}`}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors duration-300',
                i < step && 'bg-primary',
                i === step && 'bg-primary/40',
                i > step && 'bg-muted',
              )}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <p className="text-muted-foreground mb-2 text-sm">{current.context}</p>
            <h2 className="font-serif text-foreground mb-6 text-2xl leading-tight md:text-[1.75rem]">
              {current.question}
            </h2>

            <div className="mb-8 grid grid-cols-2 gap-3">
              {current.options.map(opt => {
                const isCustom = opt.id === 'custom'
                const selected =
                  currentEntry?.kind === 'option' && currentEntry.optionId === opt.id
                const customSelected = currentEntry?.kind === 'custom' && isCustom
                const active = selected || customSelected

                return (
                  <motion.button
                    key={opt.id}
                    type="button"
                    onClick={() => selectOption(current, opt.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      'rounded-2xl border-2 p-4 text-left transition-all',
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-foreground hover:border-primary/40',
                    )}
                  >
                    <span className="text-sm font-medium">{opt.label}</span>
                    {opt.detail ? (
                      <p
                        className={cn(
                          'mt-1 text-xs',
                          active ? 'text-primary-foreground/80' : 'text-muted-foreground',
                        )}
                      >
                        {opt.detail}
                      </p>
                    ) : null}
                    {isCustom && customSelected ? (
                      <input
                        autoFocus
                        value={currentEntry.kind === 'custom' ? currentEntry.text : ''}
                        onChange={e => setCustomText(current.id, e.target.value)}
                        onClick={e => e.stopPropagation()}
                        placeholder="Describe aquí…"
                        className="mt-2 w-full border-b border-primary-foreground/40 bg-transparent text-sm text-primary-foreground outline-none placeholder:text-primary-foreground/50"
                      />
                    ) : null}
                  </motion.button>
                )
              })}
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleBack}
                disabled={step === 0}
                className="text-muted-foreground hover:text-foreground text-sm transition-colors disabled:pointer-events-none disabled:opacity-0"
              >
                Atrás
              </button>
              <div className="flex items-center gap-3">
                {onDismiss && (
                  <button
                    type="button"
                    onClick={onDismiss}
                    className="text-muted-foreground text-sm hover:text-foreground"
                  >
                    Más tarde
                  </button>
                )}
                <motion.button
                  type="button"
                  onClick={handleNext}
                  disabled={!canContinue || submitMutation.isPending}
                  whileHover={{ scale: canContinue ? 1.02 : 1 }}
                  whileTap={{ scale: canContinue ? 0.98 : 1 }}
                  className="bg-primary text-primary-foreground rounded-full px-6 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitMutation.isPending
                    ? 'Enviando…'
                    : step === questions.length - 1
                      ? 'Validar idea'
                      : 'Continuar'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
