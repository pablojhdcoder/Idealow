"use strict";
/**
 * Límites alineados con Azure OpenAI / Foundry (~25 MiB por petición).
 * Las imágenes van en base64 en el JSON del chat (~4/3 del tamaño en bruto).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AI_ALIGNED_MAX_UPLOAD_MB = exports.MAX_UPLOAD_BYTES_FOR_IDEA_PIPELINE = exports.MAX_WHISPER_INPUT_BYTES = exports.MAX_VISION_INPUT_BYTES = exports.AZURE_OPENAI_MAX_BODY_BYTES = void 0;
/** Tope habitual del cuerpo HTTP en Azure (error 413 si se supera). */
exports.AZURE_OPENAI_MAX_BODY_BYTES = 26214400;
const VISION_JSON_OVERHEAD_BUDGET = 24000;
/** Binario máximo de imagen antes de base64 para chat con visión. */
exports.MAX_VISION_INPUT_BYTES = Math.floor(((exports.AZURE_OPENAI_MAX_BODY_BYTES - VISION_JSON_OVERHEAD_BUDGET) * 3) / 4);
/** Transcripción: ~25 MiB por archivo en OpenAI/Azure; margen bajo el 413. */
exports.MAX_WHISPER_INPUT_BYTES = 24 * 1024 * 1024;
/**
 * Tope de subida para archivos de idea: igual al de visión (más estricto que Whisper).
 * Todo lo que acepta multer puede procesarse vía IA sin superar el límite del proveedor.
 */
exports.MAX_UPLOAD_BYTES_FOR_IDEA_PIPELINE = exports.MAX_VISION_INPUT_BYTES;
/**
 * Entero MiB para `multer` y mensajes: el mayor entero tal que n·1024² ≤ MAX_VISION_INPUT_BYTES.
 */
exports.AI_ALIGNED_MAX_UPLOAD_MB = Math.floor(exports.MAX_UPLOAD_BYTES_FOR_IDEA_PIPELINE / (1024 * 1024));
