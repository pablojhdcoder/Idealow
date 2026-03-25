/**
 * Microsoft Foundry / Azure OpenAI: IDs de modelo al crear **deployments** en Azure.
 * @see https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure
 *
 * Calidad/precio (priorizando línea reciente GPT-5.4, ~mar 2026):
 * - **gpt-5.4-nano**: chat completions, salidas estructuradas, texto e imagen — ideal como
 *   base única para extracción JSON, sugerencias cortas y OCR/diagramas (un solo deployment barato).
 * - **gpt-5-mini**: alternativa si la extracción en notas muy largas o ambiguas falla en calidad;
 *   apunta `AZURE_OPENAI_DEPLOYMENT_EXTRACTION` a un deployment de este modelo.
 * - **whisper**: transcripción de audio (deployment separado).
 */

export const RECOMMENDED_FOUNDRY_CHAT_MODEL = 'gpt-5.4-nano' as const
export const RECOMMENDED_FOUNDRY_EXTRACTION_UPGRADE_MODEL = 'gpt-5-mini' as const
export const RECOMMENDED_FOUNDRY_WHISPER_MODEL = 'whisper' as const
