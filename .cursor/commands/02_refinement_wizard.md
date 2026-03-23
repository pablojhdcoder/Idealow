# Command: Refinement Wizard

## Task
Wizard de refinamiento de 5 pasos. NO es un chat — es un flujo estructurado donde OpenRouter genera preguntas personalizadas y el usuario elige entre opciones concretas.

---

## Endpoints

```
POST /api/ideas/:id/refine/questions   → genera las 5 preguntas
POST /api/ideas/:id/refine/answers     → procesa respuestas → idea refinada
```

---

## `backend/src/services/ai/refiner.ts`

```ts
import OpenAI from 'openai'
import { config } from '../../config'

const client = new OpenAI({
  apiKey: config.openrouterApiKey,
  baseURL: 'https://openrouter.ai/api/v1',
})

const QUESTIONS_PROMPT = `You are a product strategist helping refine an idea before market validation.

Generate exactly 5 refinement questions. Each must:
- Be concrete and specific to THIS idea (never generic)
- Have 3-4 meaningfully different answer options
- Always include a "Something else" option
- Be answerable in under 10 seconds

Return ONLY this JSON, no markdown:
{
  "questions": [
    {
      "id": "q1",
      "question": "Question text here",
      "context": "One sentence: why this matters for validation",
      "options": [
        { "id": "a", "label": "Short label", "detail": "Optional brief explanation" },
        { "id": "b", "label": "...", "detail": "..." },
        { "id": "c", "label": "...", "detail": "..." },
        { "id": "custom", "label": "Something else", "detail": null }
      ]
    }
  ]
}

Topics must cover in this order:
1. Who specifically PAYS for this (not just uses it)
2. The main competing solution they currently use
3. The ONE feature without which this product doesn't exist
4. The most realistic first distribution channel
5. Timeline to first paying customer`

const SYNTHESIS_PROMPT = `You are a product strategist. Combine the original idea with the user's 
refinement answers to produce a sharper, more concrete version.

Return ONLY this JSON, no markdown:
{
  "refined_title": "Sharper title based on answers",
  "elevator_pitch": "One sentence. What it is, for whom, why now.",
  "problem_statement": "2-3 sentences. Specific, painful, measurable.",
  "solution": "2-3 sentences. Concrete, differentiated.",
  "target_customer": "Hyper-specific description of who this is for",
  "monetization": "How it makes money. Be specific.",
  "mvp_feature": "The single feature that defines the MVP",
  "distribution": "First channel to get first 100 users",
  "why_now": "Why is this the right moment to build this?",
  "biggest_risk": "The one thing most likely to kill this idea",
  "search_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}`

export async function generateQuestions(idea: {
  title: string
  problem: string
  solution: string
  target_audience: string
  sector: string
}) {
  const response = await client.chat.completions.create({
    model: process.env.REFINEMENT_MODEL || 'openai/gpt-oss-20b:free',
    messages: [{
      role: 'system', content: QUESTIONS_PROMPT
    }, {
      role: 'user', content: `Idea to refine:
Title: ${idea.title}
Problem: ${idea.problem}
Solution: ${idea.solution}
Target audience: ${idea.target_audience}
Sector: ${idea.sector}`
    }],
    temperature: 0.2,
  })

  const text = response.choices[0]?.message?.content || '{}'
  return JSON.parse(text)
}

export async function synthesizeAnswers(
  originalIdea: object,
  answers: Array<{ questionId: string; answer: string }>,
  userProfile: { sectors: string[]; goal: string }
) {
  const response = await client.chat.completions.create({
    model: process.env.REFINEMENT_MODEL || 'openai/gpt-oss-20b:free',
    messages: [{
      role: 'system', content: SYNTHESIS_PROMPT
    }, {
      role: 'user', content: `Original idea: ${JSON.stringify(originalIdea)}
User answers: ${JSON.stringify(answers)}
User profile: sectors=${userProfile.sectors.join(', ')}, goal=${userProfile.goal}`
    }],
    temperature: 0.2,
  })

  const text = response.choices[0]?.message?.content || '{}'
  return JSON.parse(text)
}
```

---

## `backend/src/routes/ideas.ts` — añadir estas rutas

```ts
import { generateQuestions, synthesizeAnswers } from '../services/ai/refiner'

// GET questions for refinement
router.post('/:id/refine/questions', requireAuth, async (req, res) => {
  try {
    const idea = await prisma.idea.findUnique({
      where: { id: req.params.id, userId: req.user!.userId }
    })
    if (!idea) return res.status(404).json({ error: 'Idea not found' })

    const extracted = idea.refinedContent as any || {}
    const questions = await generateQuestions({
      title:           idea.title,
      problem:         extracted.problem || idea.summary || '',
      solution:        extracted.solution || '',
      target_audience: extracted.target_audience || '',
      sector:          idea.sector || 'other',
    })

    res.json(questions)
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate questions', details: err })
  }
})

// POST answers → refined idea + trigger validation
router.post('/:id/refine/answers', requireAuth, async (req, res) => {
  try {
    const { answers } = req.body
    const idea = await prisma.idea.findUnique({
      where: { id: req.params.id, userId: req.user!.userId },
      include: { user: true }
    })
    if (!idea) return res.status(404).json({ error: 'Idea not found' })

    const refined = await synthesizeAnswers(
      idea.refinedContent || {},
      answers,
      { sectors: idea.user.sectors, goal: idea.user.goal }
    )

    // Save refined content + update status
    const updated = await prisma.idea.update({
      where: { id: idea.id },
      data: {
        refinedContent: refined,
        title:          refined.refined_title || idea.title,
        summary:        refined.elevator_pitch,
        status:         'REFINING',
      }
    })

    // Enqueue validation job
    const { validationQueue } = await import('../workers/validationJob')
    await validationQueue.add('validate', { ideaId: idea.id })

    res.json({ idea: updated, nextStep: 'validation' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to process answers', details: err })
  }
})
```

---

## Frontend: `src/components/ideas/RefinementWizard.tsx`

### Especificación de diseño
- Overlay fullscreen con `backdrop-blur-sm` y fondo `rgba(0,0,0,0.3)`
- Barra de progreso en la parte superior (step X de 5)
- Una sola pregunta visible a la vez
- Pregunta en `font-serif` grande (28-32px)
- Contexto hint en texto pequeño muted bajo la pregunta
- Opciones como pills grandes en grid 2x2 (`rounded-2xl`)
- Estado seleccionado: fondo indigo, texto blanco, scale 1.02
- Opción "custom" abre input inline con animación
- Botones: "Atrás" (ghost) + "Continuar" (filled, `rounded-full`)
- Transición entre preguntas: slide horizontal con `AnimatePresence`
- Soporte teclado: 1/2/3/4 para seleccionar, Enter para continuar

```tsx
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'

type Question = {
  id: string
  question: string
  context: string
  options: { id: string; label: string; detail: string | null }[]
}

export function RefinementWizard({ ideaId, onComplete }: {
  ideaId: string
  onComplete: () => void
}) {
  const [step, setStep]       = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [custom, setCustom]   = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['questions', ideaId],
    queryFn: () => fetch(`/api/ideas/${ideaId}/refine/questions`, {
      method: 'POST',
      credentials: 'include',
    }).then(r => r.json()),
  })

  const submitMutation = useMutation({
    mutationFn: (answers: object) =>
      fetch(`/api/ideas/${ideaId}/refine/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })) }),
      }).then(r => r.json()),
    onSuccess: onComplete,
  })

  if (isLoading) return <WizardSkeleton />

  const questions: Question[] = data?.questions || []
  const current = questions[step]
  const selected = answers[current?.id]

  const handleSelect = (optionId: string) => {
    setAnswers(prev => ({ ...prev, [current.id]: optionId === 'custom' ? custom : optionId }))
  }

  const handleNext = () => {
    if (step < questions.length - 1) {
      setStep(s => s + 1)
    } else {
      submitMutation.mutate(answers)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30">
      <div className="bg-white rounded-3xl p-8 w-full max-w-lg mx-4 shadow-2xl">
        {/* Progress bar */}
        <div className="flex gap-1.5 mb-8">
          {questions.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300
              ${i < step ? 'bg-indigo-500' : i === step ? 'bg-indigo-300' : 'bg-gray-100'}`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <p className="text-sm text-gray-400 mb-2">{current?.context}</p>
            <h2 className="font-serif text-2xl text-gray-900 mb-6 leading-tight">
              {current?.question}
            </h2>

            <div className="grid grid-cols-2 gap-3 mb-8">
              {current?.options.map(opt => (
                <motion.button
                  key={opt.id}
                  onClick={() => handleSelect(opt.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-4 rounded-2xl text-left border-2 transition-all
                    ${selected === opt.id || (opt.id === 'custom' && custom && selected === custom)
                      ? 'bg-indigo-500 border-indigo-500 text-white'
                      : 'bg-white border-gray-100 text-gray-700 hover:border-indigo-200'
                    }`}
                >
                  <span className="font-medium text-sm">{opt.label}</span>
                  {opt.detail && (
                    <p className={`text-xs mt-1 ${selected === opt.id ? 'text-indigo-100' : 'text-gray-400'}`}>
                      {opt.detail}
                    </p>
                  )}
                  {opt.id === 'custom' && selected === custom && (
                    <input
                      autoFocus
                      value={custom}
                      onChange={e => { setCustom(e.target.value); setAnswers(prev => ({ ...prev, [current.id]: e.target.value })) }}
                      onClick={e => e.stopPropagation()}
                      placeholder="Describe aquí..."
                      className="mt-2 w-full bg-transparent border-b border-white/50 text-white placeholder-white/50 text-sm outline-none"
                    />
                  )}
                </motion.button>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={() => setStep(s => Math.max(0, s - 1))}
                disabled={step === 0}
                className="text-sm text-gray-400 hover:text-gray-600 disabled:opacity-0 transition-colors"
              >
                Atrás
              </button>
              <motion.button
                onClick={handleNext}
                disabled={!selected}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-2.5 bg-indigo-500 text-white rounded-full text-sm font-medium
                  disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                {step === questions.length - 1 ? 'Validar idea' : 'Continuar'}
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
```

---

## Archivos a crear
- `backend/src/services/ai/refiner.ts`
- `backend/src/workers/validationJob.ts` (BullMQ queue setup)
- `frontend/src/components/ideas/RefinementWizard.tsx`
- `frontend/src/components/ideas/WizardSkeleton.tsx`
