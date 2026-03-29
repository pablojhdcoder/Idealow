import { describe, expect, it } from 'vitest'
import {
  AI_ALIGNED_MAX_UPLOAD_MB,
  MAX_UPLOAD_BYTES_FOR_IDEA_PIPELINE,
  MAX_VISION_INPUT_BYTES,
  MAX_WHISPER_INPUT_BYTES,
} from '../../src/lib/uploadLimits'

describe('uploadLimits', () => {
  it('el límite entero MiB de multer no supera el tope de visión', () => {
    expect(AI_ALIGNED_MAX_UPLOAD_MB * 1024 * 1024).toBeLessThanOrEqual(MAX_VISION_INPUT_BYTES)
  })

  it('Whisper admite al menos lo que multer puede aceptar', () => {
    expect(MAX_WHISPER_INPUT_BYTES).toBeGreaterThanOrEqual(MAX_UPLOAD_BYTES_FOR_IDEA_PIPELINE)
  })
})
