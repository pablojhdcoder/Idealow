import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { RefinementQuestion } from '@/types/idea'
import { ApiError } from '@/lib/api/client'
import { requestRefineQuestions, submitRefineAnswers } from '@/lib/api/ideas'
import { WizardSkeleton } from '@/components/ideas/WizardSkeleton'
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
      onComplete(ideaId)
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
    const onKeyDown = (e: KeyboardEvent) => {
      if (!current || submitMutation.isPending) return
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
  }, [current, canContinue, handleNext, selectOption, submitMutation.isPending])

  if (isLoading) {
    return <WizardSkeleton />
  }

  if (isError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <div className="bg-card mx-4 w-full max-w-lg rounded-3xl border border-border p-8 shadow-2xl">
          <p className="text-destructive text-sm">
            {error instanceof ApiError ? error.message : 'No se pudieron cargar las preguntas'}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              className="text-muted-foreground text-sm underline"
              onClick={() => void refetch()}
            >
              Reintentar
            </button>
            {onDismiss && (
              <button type="button" className="text-primary text-sm font-medium" onClick={onDismiss}>
                Cerrar
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!current) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-card mx-4 w-full max-w-lg rounded-3xl border border-border p-8 shadow-2xl">
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
  )
}
