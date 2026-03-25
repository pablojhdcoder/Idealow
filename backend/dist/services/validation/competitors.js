"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCompetitors = validateCompetitors;
const zod_1 = require("zod");
const config_1 = require("../../config");
const azureOpenAI_1 = require("../../lib/azureOpenAI");
const chatCompletionSamplingFallback_1 = require("../ai/chatCompletionSamplingFallback");
const openaiMessageText_1 = require("../ai/openaiMessageText");
const logger_1 = require("../../lib/logger");
const parseAiJson_1 = require("./parseAiJson");
const competitorEntrySchema = zod_1.z.object({
    name: zod_1.z.string(),
    url: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    strength: zod_1.z.string().optional(),
    weakness: zod_1.z.string().optional(),
    approximate_users: zod_1.z.string().optional(),
});
const competitorsSchema = zod_1.z.object({
    score: zod_1.z.coerce.number().min(0).max(100),
    competitors: zod_1.z.array(competitorEntrySchema).optional(),
    gap_analysis: zod_1.z
        .object({
        gap: zod_1.z.string().optional(),
        positioning: zod_1.z.string().optional(),
        advantage: zod_1.z.string().optional(),
    })
        .optional(),
    summary: zod_1.z.string().optional(),
});
async function validateCompetitors(idea) {
    const client = (0, azureOpenAI_1.getAzureOpenAIClient)();
    const response = await (0, chatCompletionSamplingFallback_1.chatCompletionsCreateWithSamplingFallback)(client, {
        model: config_1.config.azure.deploymentChat,
        messages: [
            {
                role: 'user',
                content: `Find competitors for this idea and analyze the market gap.
Title: ${idea.elevator_pitch}
Problem: ${idea.problem_statement}
Keywords: ${idea.search_keywords.join(', ')}

Return ONLY this JSON:
{
  "score": 0-100,
  "competitors": [
    {
      "name": "...",
      "url": "...",
      "description": "...",
      "strength": "what they do well",
      "weakness": "their main gap from user reviews",
      "approximate_users": "..."
    }
  ],
  "gap_analysis": {
    "gap": "The clearest unmet need",
    "positioning": "How this idea should position itself",
    "advantage": "Key differentiator"
  },
  "summary": "2 sentence market overview"
}`,
            },
        ],
        temperature: 0.2,
    });
    const text = (0, openaiMessageText_1.completionContentToPlainText)(response.choices[0]?.message?.content) || '{}';
    const parsed = competitorsSchema.safeParse((0, parseAiJson_1.parseJsonObject)(text));
    if (!parsed.success) {
        logger_1.logger.warn({ err: parsed.error.flatten() }, 'competitors validation parse failed');
        return {
            score: 50,
            competitors: [],
            summary: 'Competitor analysis could not be parsed; neutral score applied.',
        };
    }
    return parsed.data;
}
