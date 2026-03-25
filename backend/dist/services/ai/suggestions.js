"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSuggestions = generateSuggestions;
const config_1 = require("../../config");
const azureOpenAI_1 = require("../../lib/azureOpenAI");
const chatCompletionSamplingFallback_1 = require("./chatCompletionSamplingFallback");
const openaiMessageText_1 = require("./openaiMessageText");
const stripMarkdown = (v) => v.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
async function generateSuggestions(profile) {
    const client = (0, azureOpenAI_1.getAzureOpenAIClient)();
    const response = await (0, chatCompletionSamplingFallback_1.chatCompletionsCreateWithSamplingFallback)(client, {
        model: config_1.config.azure.deploymentSuggestions,
        messages: [
            {
                role: 'system',
                content: 'You are an idea prompt generator. Return ONLY a JSON array of 5 short idea prompts (strings, max 15 words each). No markdown, no explanation.',
            },
            {
                role: 'user',
                content: `Generate 5 startup idea prompts for: sectors=${profile.sectors.join(', ')}, experience=${profile.experienceLevel}, goal=${profile.goal}`,
            },
        ],
        temperature: 0.8,
        max_tokens: 400,
    });
    const text = (0, openaiMessageText_1.completionContentToPlainText)(response.choices[0]?.message?.content) || '[]';
    try {
        const parsed = JSON.parse(stripMarkdown(text));
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}
