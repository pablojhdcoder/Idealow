/**
 * Límites alineados con Azure OpenAI / Foundry (~25 MiB por petición).
 * Las imágenes van en base64 en el JSON del chat (~4/3 del tamaño en bruto).
 */

/** Tope habitual del cuerpo HTTP en Azure (error 413 si se supera). */
export const AZURE_OPENAI_MAX_BODY_BYTES = 26_214_400

const VISION_JSON_OVERHEAD_BUDGET = 24_000

/** Binario máximo de imagen antes de base64 para chat con visión. */
export const MAX_VISION_INPUT_BYTES = Math.floor(
  ((AZURE_OPENAI_MAX_BODY_BYTES - VISION_JSON_OVERHEAD_BUDGET) * 3) / 4,
)

/** Transcripción: ~25 MiB por archivo en OpenAI/Azure; margen bajo el 413. */
export const MAX_WHISPER_INPUT_BYTES = 24 * 1024 * 1024

/**
 * Tope de subida para archivos de idea: igual al de visión (más estricto que Whisper).
 * Todo lo que acepta multer puede procesarse vía IA sin superar el límite del proveedor.
 */
export const MAX_UPLOAD_BYTES_FOR_IDEA_PIPELINE = MAX_VISION_INPUT_BYTES

/**
 * Entero MiB para `multer` y mensajes: el mayor entero tal que n·1024² ≤ MAX_VISION_INPUT_BYTES.
 */
export const AI_ALIGNED_MAX_UPLOAD_MB = Math.floor(MAX_UPLOAD_BYTES_FOR_IDEA_PIPELINE / (1024 * 1024))
