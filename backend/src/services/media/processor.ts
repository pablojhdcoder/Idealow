import axios from 'axios'
import fs from 'fs/promises'
import path from 'path'
import { toFile } from 'openai/uploads'
import { PDFParse } from 'pdf-parse'
import { config } from '../../config'
import { HttpError } from '../../lib/httpError'
import {
  MAX_VISION_INPUT_BYTES,
  MAX_WHISPER_INPUT_BYTES,
} from '../../lib/uploadLimits'
import { getAzureOpenAIClient } from '../../lib/azureOpenAI'
import { chatCompletionsCreateWithSamplingFallback } from '../ai/chatCompletionSamplingFallback'
import { completionContentToPlainText } from '../ai/openaiMessageText'

export const WHISPER_DEPLOYMENT_MISSING = 'WHISPER_DEPLOYMENT_MISSING' as const

const isMediaUrl = (value: string) => value.startsWith('http://') || value.startsWith('https://')
const mediaExtensions = ['mp3', 'mp4', 'wav', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'm4a', 'ogg', 'pdf']
const textMimeTypes = new Set(['text/plain', 'text/markdown', 'text/x-markdown'])
const textFileExtensions = new Set(['txt', 'md', 'markdown'])
const audioMimeTypes = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/ogg'])
const imageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const pdfMimeTypes = new Set(['application/pdf'])

export async function processMedia(filePathOrUrl: string, mimeType?: string): Promise<string> {
  const ext = path.extname(filePathOrUrl).replace('.', '').toLowerCase()
  const isUrl = isMediaUrl(filePathOrUrl)
  const isPdf = ext === 'pdf' || (mimeType ? pdfMimeTypes.has(mimeType) : false)

  if (isUrl && !mediaExtensions.includes(ext)) {
    const { data } = await axios.get<string>(filePathOrUrl, { timeout: 10000 })
    return data.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 5000)
  }

  if (['mp3', 'mp4', 'wav', 'm4a', 'ogg'].includes(ext) || (mimeType ? audioMimeTypes.has(mimeType) : false)) {
    if (!config.azure.deploymentWhisper) {
      throw new Error(WHISPER_DEPLOYMENT_MISSING)
    }

    const client = getAzureOpenAIClient()
    const bytes = isUrl
      ? Buffer.from((await axios.get<ArrayBuffer>(filePathOrUrl, { responseType: 'arraybuffer' })).data)
      : await fs.readFile(filePathOrUrl)

    if (bytes.length > MAX_WHISPER_INPUT_BYTES) {
      throw new HttpError(
        413,
        'El audio o vídeo supera el límite del servicio de transcripción (~25 MB). Sube un archivo más corto o comprímelo.',
        'IDEAS_MEDIA_PROVIDER_LIMIT',
      )
    }

    const transcription = await client.audio.transcriptions.create({
      file: await toFile(bytes, `audio.${ext || 'mp3'}`),
      model: config.azure.deploymentWhisper,
    })

    return transcription.text
  }

  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) || (mimeType ? imageMimeTypes.has(mimeType) : false)) {
    const client = getAzureOpenAIClient()
    const bytes = isUrl
      ? Buffer.from((await axios.get<ArrayBuffer>(filePathOrUrl, { responseType: 'arraybuffer' })).data)
      : await fs.readFile(filePathOrUrl)

    if (bytes.length > MAX_VISION_INPUT_BYTES) {
      throw new HttpError(
        413,
        'La imagen es demasiado grande para el modelo de visión (límite ~25 MB por petición en Azure; con base64 el máximo práctico es menor). Reduce resolución o comprime el archivo.',
        'IDEAS_MEDIA_PROVIDER_LIMIT',
      )
    }

    const base64 = bytes.toString('base64')
    const mediaType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
    const msg = await chatCompletionsCreateWithSamplingFallback(client, {
      model: config.azure.deploymentVision,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extrae todo el texto y describe cualquier diagrama o boceto que aparezca. Devuelve solo texto plano.',
            },
            {
              type: 'image_url',
              image_url: { url: `data:${mediaType};base64,${base64}` },
            },
          ],
        },
      ],
      temperature: 0.2,
    })

    return completionContentToPlainText(msg.choices[0]?.message?.content)
  }

  if (isPdf) {
    const bytes = isUrl
      ? Buffer.from((await axios.get<ArrayBuffer>(filePathOrUrl, { responseType: 'arraybuffer' })).data)
      : await fs.readFile(filePathOrUrl)

    const parser = new PDFParse({ data: bytes })
    const parsed = await parser.getText()
    await parser.destroy()
    return (parsed.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 5000)
  }

  if (!isUrl) {
    const asTextByMime = Boolean(mimeType && textMimeTypes.has(mimeType))
    const asTextByExt = textFileExtensions.has(ext)
    if (asTextByMime || asTextByExt) {
      try {
        const textFile = await fs.readFile(filePathOrUrl, 'utf8')
        return textFile.trim().slice(0, 5000)
      } catch {
        return ''
      }
    }
  }

  throw new Error('UNSUPPORTED_MEDIA: Unsupported media format')
}
