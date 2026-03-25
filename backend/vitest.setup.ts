/**
 * Arranque de Vitest (ver `vitest.config.ts` → `setupFiles`).
 * No es un archivo *.test.ts: solo fija `process.env` antes de importar `src/config`,
 * porque `validateCriticalEnv()` se ejecuta al cargar el módulo de configuración.
 */
process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5432/idealow_test?schema=public'
process.env.JWT_SECRET ??= 'test-jwt-secret-at-least-32-characters-long'
process.env.AZURE_OPENAI_ENDPOINT ??= 'https://test-resource.openai.azure.com'
process.env.AZURE_OPENAI_API_KEY ??= 'test-azure-api-key'
process.env.AZURE_OPENAI_DEPLOYMENT_CHAT ??= 'test-chat-deployment'
process.env.OPENAI_API_VERSION ??= '2024-12-01-preview'
