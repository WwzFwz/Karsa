/**
 * Local speech recognition, in its own worker (section 6).
 *
 * Whisper through transformers.js: WebGPU where the browser has it, WASM where
 * it does not (D3). Audio arrives as 16 kHz mono samples and text leaves; the
 * samples never go anywhere else. The model files are fetched once and kept in
 * the browser cache, so the second session starts without the network.
 *
 * The canvas must not stutter while this thinks, which is the whole reason it
 * is a worker and not a function.
 */

import { env, pipeline, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers'

env.allowLocalModels = false

type Request =
  | { type: 'load'; model: string }
  | { type: 'transcribe'; id: number; audio: Float32Array; final: boolean; language: 'auto' | 'id' | 'en' }

let asr: AutomaticSpeechRecognitionPipeline | null = null
let loading: Promise<void> | null = null
let loadedModel = ''
let device: 'webgpu' | 'wasm' = 'wasm'

// The library's overloads for every task make this call too wide for tsc.
const makePipeline = pipeline as unknown as (
  task: 'automatic-speech-recognition',
  model: string,
  options: Record<string, unknown>,
) => Promise<AutomaticSpeechRecognitionPipeline>

const post = (message: unknown) => (self as unknown as Worker).postMessage(message)

async function hasWebGpu(): Promise<boolean> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu
  if (!gpu) return false
  try {
    return (await gpu.requestAdapter()) !== null
  } catch {
    return false
  }
}

async function load(model: string): Promise<void> {
  if (asr && loadedModel === model) return
  if (loading && loadedModel === model) return loading
  loadedModel = model
  loading = (async () => {
    device = (await hasWebGpu()) ? 'webgpu' : 'wasm'
    const files = new Map<string, { loaded: number; total: number }>()
    const make = (d: 'webgpu' | 'wasm') =>
      makePipeline('automatic-speech-recognition', model, {
        device: d,
        // The encoder is small and precision-sensitive; the decoder is where
        // quantisation pays for itself.
        dtype: d === 'webgpu' ? { encoder_model: 'fp32', decoder_model_merged: 'q4' } : 'q8',
        progress_callback: (p: { status: string; file?: string; loaded?: number; total?: number }) => {
          if (p.status === 'progress' && p.file) {
            files.set(p.file, { loaded: p.loaded ?? 0, total: p.total ?? 0 })
            let loaded = 0
            let total = 0
            files.forEach((f) => {
              loaded += f.loaded
              total += f.total
            })
            post({ type: 'progress', percent: total > 0 ? Math.round((loaded / total) * 100) : 0 })
          }
        },
      })
    try {
      asr = await make(device)
    } catch (error) {
      if (device !== 'webgpu') throw error
      device = 'wasm'
      asr = await make('wasm')
    }
    // One silent pass compiles the shaders now instead of on the first sentence.
    await asr(new Float32Array(16000), { language: 'indonesian', task: 'transcribe' })
    post({ type: 'ready', device, model })
  })()
  try {
    await loading
  } catch (error) {
    asr = null
    loadedModel = ''
    post({ type: 'error', message: error instanceof Error ? error.message : String(error) })
  } finally {
    loading = null
  }
}

self.onmessage = async (event: MessageEvent<Request>) => {
  const message = event.data
  if (message.type === 'load') {
    await load(message.model)
    return
  }
  if (message.type === 'transcribe') {
    if (!asr) {
      post({ type: 'result', id: message.id, final: message.final, text: '', error: 'Model belum siap.' })
      return
    }
    try {
      const output = await asr(message.audio, {
        // Auto leaves the language out, and Whisper detects it per sentence.
        ...(message.language === 'auto'
          ? {}
          : { language: message.language === 'en' ? 'english' : 'indonesian' }),
        task: 'transcribe',
        chunk_length_s: 30,
        stride_length_s: 5,
      })
      const text = (Array.isArray(output) ? output.map((o) => o.text).join(' ') : output.text).trim()
      post({ type: 'result', id: message.id, final: message.final, text })
    } catch (error) {
      post({
        type: 'result',
        id: message.id,
        final: message.final,
        text: '',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
