"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSuggestions = generateSuggestions;
const openai_1 = __importDefault(require("openai"));
const config_1 = require("../../config");
const client = new openai_1.default({
    apiKey: config_1.config.openrouterApiKey,
    baseURL: 'https://openrouter.ai/api/v1',
});
const stripMarkdown = (v) => v.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
async function generateSuggestions(profile) {
    const response = await client.chat.completions.create({
        model: process.env.EXTRACTION_MODEL ?? 'openai/gpt-oss-20b:free',
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
    const text = response.choices[0]?.message?.content ?? '[]';
    try {
        const parsed = JSON.parse(stripMarkdown(text));
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}
