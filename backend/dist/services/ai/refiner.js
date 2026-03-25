"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refinementQuestionsResponseSchema = void 0;
exports.generateQuestions = generateQuestions;
exports.synthesizeAnswers = synthesizeAnswers;
const openai_1 = require("openai");
const zod_1 = require("zod");
const config_1 = require("../../config");
const httpError_1 = require("../../lib/httpError");
const azureOpenAI_1 = require("../../lib/azureOpenAI");
const chatCompletionSamplingFallback_1 = require("./chatCompletionSamplingFallback");
const openaiMessageText_1 = require("./openaiMessageText");
const QUESTIONS_PROMPT = `You are a product strategist helping refine an idea before market validation.

Generate exactly 5 refinement questions. Each must:
- Be concrete and specific to THIS idea (never generic)
- Have 3-4 meaningfully different answer options
- Always include a "Something else" option with id "custom"
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
5. Timeline to first paying customer`;
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
}`;
const refinementOptionSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    label: zod_1.z.string().min(1),
    detail: zod_1.z.string().nullable().optional(),
});
const refinementQuestionSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    question: zod_1.z.string().min(1),
    context: zod_1.z.string().min(1),
    options: zod_1.z.array(refinementOptionSchema).min(3).max(6),
});
exports.refinementQuestionsResponseSchema = zod_1.z.object({
    questions: zod_1.z.array(refinementQuestionSchema).length(5),
});
const refinedIdeaSchema = zod_1.z.object({
    refined_title: zod_1.z.string().min(1),
    elevator_pitch: zod_1.z.string().min(1),
    problem_statement: zod_1.z.string().min(1),
    solution: zod_1.z.string().min(1),
    target_customer: zod_1.z.string().min(1),
    monetization: zod_1.z.string().min(1),
    mvp_feature: zod_1.z.string().min(1),
    distribution: zod_1.z.string().min(1),
    why_now: zod_1.z.string().min(1),
    biggest_risk: zod_1.z.string().min(1),
    search_keywords: zod_1.z.array(zod_1.z.string()).min(3).max(12),
});
const stripMarkdownCodeFence = (value) => {
    const trimmed = value.trim();
    if (!trimmed.startsWith('```')) {
        return trimmed;
    }
    return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
};
function parseJsonOrThrow(raw, code) {
    const cleaned = stripMarkdownCodeFence(raw);
    try {
        return JSON.parse(cleaned);
    }
    catch {
        throw new httpError_1.HttpError(502, 'Refinement AI returned non-JSON', code);
    }
}
async function generateQuestions(idea) {
    const client = (0, azureOpenAI_1.getAzureOpenAIClient)();
    let response;
    try {
        response = await (0, chatCompletionSamplingFallback_1.chatCompletionsCreateWithSamplingFallback)(client, {
            model: config_1.config.azure.deploymentChat,
            messages: [
                { role: 'system', content: QUESTIONS_PROMPT },
                {
                    role: 'user',
                    content: `Idea to refine:
Title: ${idea.title}
Problem: ${idea.problem}
Solution: ${idea.solution}
Target audience: ${idea.target_audience}
Sector: ${idea.sector}`,
                },
            ],
            temperature: 0.2,
        });
    }
    catch (e) {
        if (e instanceof openai_1.APIError) {
            throw new httpError_1.HttpError(502, `Microsoft Foundry / Azure OpenAI error: ${e.message}`, 'REFINE_AI_PROVIDER_ERROR');
        }
        throw e;
    }
    const text = (0, openaiMessageText_1.completionContentToPlainText)(response.choices[0]?.message?.content) || '{}';
    const parsed = parseJsonOrThrow(text, 'REFINE_QUESTIONS_NON_JSON');
    const result = exports.refinementQuestionsResponseSchema.safeParse(parsed);
    if (!result.success) {
        throw new httpError_1.HttpError(502, 'Refinement questions: invalid AI response', 'REFINE_QUESTIONS_INVALID', config_1.config.nodeEnv === 'development' ? result.error.flatten() : undefined);
    }
    for (const q of result.data.questions) {
        const hasCustom = q.options.some(o => o.id === 'custom');
        if (!hasCustom) {
            throw new httpError_1.HttpError(502, 'Refinement questions: missing custom option', 'REFINE_QUESTIONS_INVALID');
        }
    }
    return result.data;
}
async function synthesizeAnswers(originalIdea, answers, userProfile) {
    const client = (0, azureOpenAI_1.getAzureOpenAIClient)();
    let response;
    try {
        response = await (0, chatCompletionSamplingFallback_1.chatCompletionsCreateWithSamplingFallback)(client, {
            model: config_1.config.azure.deploymentChat,
            messages: [
                { role: 'system', content: SYNTHESIS_PROMPT },
                {
                    role: 'user',
                    content: `Original idea: ${JSON.stringify(originalIdea)}
User answers: ${JSON.stringify(answers)}
User profile: sectors=${userProfile.sectors.join(', ')}, goal=${userProfile.goal}`,
                },
            ],
            temperature: 0.2,
        });
    }
    catch (e) {
        if (e instanceof openai_1.APIError) {
            throw new httpError_1.HttpError(502, `Microsoft Foundry / Azure OpenAI error: ${e.message}`, 'REFINE_AI_PROVIDER_ERROR');
        }
        throw e;
    }
    const text = (0, openaiMessageText_1.completionContentToPlainText)(response.choices[0]?.message?.content) || '{}';
    const parsed = parseJsonOrThrow(text, 'REFINE_SYNTHESIS_NON_JSON');
    const result = refinedIdeaSchema.safeParse(parsed);
    if (!result.success) {
        throw new httpError_1.HttpError(502, 'Refinement synthesis: invalid AI response', 'REFINE_SYNTHESIS_INVALID', config_1.config.nodeEnv === 'development' ? result.error.flatten() : undefined);
    }
    return result.data;
}
