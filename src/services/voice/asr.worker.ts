/**
 * Local speech recognition, in its own worker (section 6).
 *
 * Whisper through transformers.js: WebGPU where the browser has it, WASM where
 * it does not (D3). Audio arrives as 16 kHz mono samples and text leaves; the
 * samples never go anywhere else. The model files are fetched once and kept in
 * the browser cache, so the second session starts without the network.
 *
 * Where they are fetched *from* is configuration, because it is the difference
 * between the two installs section 7 describes. Unset, they come from the
 * Hugging Face CDN, which suits a laptop with internet. Set `VITE_MODEL_URL`
 * to the server the page came from and the first session works too on a
 * network with no way out -- which is the whole of mode kelas.
 *
 * The canvas must not stutter while this thinks, which is the whole reason it
 * is a worker and not a function.
 */

import { env, pipeline, WhisperTextStreamer, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers'
import { modelUrl } from '../../core/config'

env.allowLocalModels = false

/*
  The runtime comes from this app, never from a CDN.

  transformers.js otherwise points `wasmPaths` at cdn.jsdelivr.net, and that one
  default quietly undid the whole of mode kelas: a room could hold every model
  file on its own server and still hear nothing, because the thing that reads
  them was fetched from the other side of the internet. `scripts/prepare-ort.mjs`
  copies the two files into `public/`, so they ship with the build.
*/
const wasm = env.backends.onnx.wasm
if (wasm) wasm.wasmPaths = new URL('/ort/', self.location.origin).href

const host = modelUrl()
if (host) {
  // Flat: <host>/<model>/<file>, which is what `npm run models` writes to disk.
  // The CDN's own path carries a revision segment; keeping it here would mean
  // an institution had to mirror a directory named after a git ref for no
  // benefit, since a self-hosted copy is whatever revision they downloaded.
  env.remoteHost = host
  env.remotePathTemplate = '{model}/'
}

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
    /*
      Precision, and the measurement that settled it.

      The decoder used to be `q4` on WebGPU, on the reasoning that the encoder
      is precision-sensitive and the decoder is where quantisation pays for
      itself. For this export that reasoning was simply wrong, and checking the
      file sizes says so in one line: whisper-base's fp16 decoder is 99.9 MB and
      its q4 decoder is 117.9 MB. Four-bit weights were costing accuracy and
      saving nothing at all.

      It matters most for exactly the language this product is for. A 74M
      parameter multilingual model has little redundancy to spare, and what it
      spends first is the languages it saw least of -- so four-bit weights show
      up as garbled Indonesian long before they show up as garbled English.

      `q4` stays as the fallback rather than the default: fp16 needs `shader-f16`,
      which most current GPUs have and some do not.

      What quantisation costs runs the other way from what it saves, so a big
      model gets the aggressive setting and a small one does not. Four-bit
      weights barely dent an 809M model, and the same weights on a 74M model are
      what garbles Indonesian; meanwhile the large encoder at full precision is
      2.4 GB to download and the small one is 79 MB. Both halves of that trade
      point the same way.
    */
    const large = /large|turbo|medium/.test(model)
    const make = (d: 'webgpu' | 'wasm', precision: 'fp16' | 'q4' = large ? 'q4' : 'fp16') =>
      makePipeline('automatic-speech-recognition', model, {
        device: d,
        dtype:
          d === 'webgpu'
            ? { encoder_model: large ? 'q4' : 'fp32', decoder_model_merged: precision }
            : 'q8',
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
      try {
        // No shader-f16 on this GPU: four-bit weights beat no WebGPU at all.
        asr = await make('webgpu', 'q4')
      } catch {
        device = 'wasm'
        asr = await make('wasm')
      }
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
      /*
        Words leave while the model is still deciding the rest of them.

        Section 10 names a streaming transcript as one of the three things that
        decide whether this feels fast, and it was only half true: the pipeline
        returned a whole sentence at once, so "streaming" meant a new sentence
        every second or so, and the gaps grew with the utterance because each
        pass re-reads the whole buffer. The decoder emits tokens one at a time
        either way; this just stops throwing them away until the end. Measured
        on a four-second clip: first words out at 662 ms, the whole answer at
        838 ms.
      */
      const tokenizer = (asr as unknown as { tokenizer: ConstructorParameters<typeof WhisperTextStreamer>[0] }).tokenizer
      let streamed = ''
      const streamer = new WhisperTextStreamer(tokenizer, {
        callback_function: (piece: string) => {
          streamed += piece
          post({ type: 'partial', id: message.id, text: streamed.trim() })
        },
      })

      const output = await asr(message.audio, {
        // Auto leaves the language out, and Whisper detects it per sentence.
        ...(message.language === 'auto'
          ? {}
          : { language: message.language === 'en' ? 'english' : 'indonesian' }),
        task: 'transcribe',
        chunk_length_s: 30,
        stride_length_s: 5,
        streamer,
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
