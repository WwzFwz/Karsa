/**
 * Microphone to transcript, on this device.
 *
 * The microphone is open only while the talk switch is on (D4): `start` opens
 * it, `stop` closes every track and hands back the finished transcript. While
 * it is open, partial transcripts stream out every so often, because a streamed
 * transcript is what makes several seconds of recognition feel like none
 * (section 10). A partial is skipped rather than queued when the worker is still
 * busy -- falling behind the speaker is worse than updating less often.
 *
 * Web Speech API is not used and must not be: it sends audio to a server
 * (section 8).
 */

import { lang } from '../../core/i18n'
import { CONFIG, modelUrl } from '../../core/config'

export type AsrModelId = string
export type AsrMode = 'whisper-base' | 'whisper-small' | 'contoh'

export const ASR_MODES: { id: AsrMode; label: string; detail: string; model?: AsrModelId }[] = [
  {
    id: 'whisper-base',
    label: 'Whisper base',
    detail: '±80 MB · cepat',
    model: CONFIG.asrModel,
  },
  {
    id: 'whisper-small',
    label: 'Whisper small',
    detail: '±250 MB · lebih teliti',
    model: CONFIG.asrModelAccurate,
  },
  {
    id: 'contoh',
    label: 'Ucapan contoh',
    detail: 'Tanpa mikrofon · untuk demo',
  },
]

const KEY = 'karsa:pengenalan-suara'

export function readAsrMode(): AsrMode {
  try {
    const value = localStorage.getItem(KEY)
    if (value && ASR_MODES.some((m) => m.id === value)) return value as AsrMode
  } catch {
    // Storage blocked; use the default.
  }
  return 'whisper-base'
}

export function writeAsrMode(mode: AsrMode): void {
  try {
    localStorage.setItem(KEY, mode)
  } catch {
    // Not remembered, still used for this session.
  }
}

/** Which language Whisper listens for. Auto lets it detect per sentence. */
export type SpeechLang = 'auto' | 'id' | 'en'
const LANG_KEY = 'karsa:bahasa-ucapan'

export function readSpeechLang(): SpeechLang {
  try {
    const value = localStorage.getItem(LANG_KEY)
    if (value === 'auto' || value === 'id' || value === 'en') return value
  } catch {
    // Storage blocked; use the default.
  }
  /*
    Named, not auto-detected. Whisper's own detection reads short Indonesian
    sentences as English often enough to be useless -- and a sentence detected
    as the wrong language does not come back slightly wrong, it comes back as
    a different sentence. Following the output language is the better guess,
    and the sidebar language switch changes both at once.
  */
  return lang() === 'en' ? 'en' : 'id'
}

/** True when someone picked a speech language instead of letting it follow. */
export function hasExplicitSpeechLang(): boolean {
  try {
    return localStorage.getItem(LANG_KEY) !== null
  } catch {
    return false
  }
}

/**
 * Keeps the microphone on the language the app is speaking, until someone
 * splits them on purpose in Settings. One switch, two things, no surprise.
 */
export function followOutputLanguage(): void {
  if (!hasExplicitSpeechLang()) recogniser.retune()
}

export function writeSpeechLang(value: SpeechLang): void {
  try {
    localStorage.setItem(LANG_KEY, value)
  } catch {
    // Not remembered, still used for this session.
  }
}

export interface AsrStatus {
  phase: 'idle' | 'loading' | 'ready' | 'error'
  percent: number
  detail: string
}

type Listener = (status: AsrStatus) => void

const SAMPLE_RATE = 16000
const PARTIAL_EVERY_MS = 1200
const MIN_SAMPLES = SAMPLE_RATE * 0.4

/** Where the voice detector's model comes from. Local when this install has one. */
const VAD_MODEL = 'onnx-community/silero-vad/onnx/model.onnx'

/*
  How long the silence after a sentence has to last before it counts as the end
  of one. Short enough that the room does not wait, long enough to survive the
  pause in the middle of "tambahkan ... pelatihan dosen".
*/
const QUIET_MS = 700

/*
  Audio kept from before the detector noticed anybody, so the first word is not
  clipped. Silero needs a window or two to be sure, and those windows contain
  the beginning of the sentence.
*/
const PREROLL_SAMPLES = SAMPLE_RATE * 0.5

/*
  The longest single utterance that will be transcribed.

  An open microphone in a meeting will eventually hear somebody talk for two
  minutes straight, and the buffer would grow the whole time for a sentence
  nobody addressed to Karsa anyway.
*/
const MAX_SAMPLES = SAMPLE_RATE * 20

/** Several captured frames as one run of samples. */
function join(chunks: Float32Array[]): Float32Array {
  const length = chunks.reduce((n, c) => n + c.length, 0)
  const out = new Float32Array(length)
  let at = 0
  for (const chunk of chunks) {
    out.set(chunk, at)
    at += chunk.length
  }
  return out
}

/**
 * Where a model file lives: this install's own server when it has one, and the
 * public CDN when it does not. Same reasoning as the transcriber (see
 * `core/config.ts`), and the same reason mode kelas can work with no internet.
 */
function modelFile(path: string): string {
  const host = modelUrl()
  return host ? `${host}/${path}` : `https://huggingface.co/${path.replace('/onnx/', '/resolve/main/onnx/')}`
}

/*
  The worklet is inline so it ships in the same bundle: mode kelas runs with no
  network, and a separate file is one more thing to fail to load.
*/
const WORKLET = `
class Capture extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0] && inputs[0][0]
    if (channel) this.port.postMessage(channel.slice(0))
    return true
  }
}
registerProcessor('karsa-capture', Capture)
`

export class SpeechRecogniser {
  private worker: Worker | null = null
  private status: AsrStatus = { phase: 'idle', percent: 0, detail: 'Belum dimuat.' }
  private listeners = new Set<Listener>()
  private model: AsrModelId = CONFIG.asrModel

  private stream: MediaStream | null = null
  private context: AudioContext | null = null
  private chunks: Float32Array[] = []
  private partialTimer: number | null = null
  private busy = false
  private nextId = 1
  private pending = new Map<number, (text: string, error?: string) => void>()

  getStatus(): AsrStatus {
    return this.status
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private setStatus(status: AsrStatus) {
    this.status = status
    this.listeners.forEach((l) => l(status))
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker
    const worker = new Worker(new URL('./asr.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event) => {
      const m = event.data
      if (m.type === 'progress') {
        this.setStatus({ phase: 'loading', percent: m.percent, detail: `Mengunduh model suara ${m.percent}%.` })
      } else if (m.type === 'ready') {
        this.setStatus({
          phase: 'ready',
          percent: 100,
          detail: `${m.model.split('/')[1]} lewat ${m.device === 'webgpu' ? 'WebGPU' : 'WASM'}, di perangkat ini.`,
        })
      } else if (m.type === 'error') {
        this.setStatus({ phase: 'error', percent: 0, detail: `Model suara gagal dimuat: ${m.message}` })
      } else if (m.type === 'result') {
        const resolve = this.pending.get(m.id)
        this.pending.delete(m.id)
        resolve?.(m.text, m.error)
      }
    }
    this.worker = worker
    return worker
  }

  /** Nothing to reload: the language is read per request. Here to notify React. */
  retune(): void {
    this.setStatus({ ...this.status })
  }

  /** Starts the download early, so the first sentence does not wait for it. */
  load(model: AsrModelId): void {
    if (this.model === model && (this.status.phase === 'ready' || this.status.phase === 'loading')) return
    this.model = model
    this.setStatus({ phase: 'loading', percent: 0, detail: 'Menyiapkan model suara.' })
    this.ensureWorker().postMessage({ type: 'load', model })
  }

  private transcribe(audio: Float32Array, final: boolean): Promise<{ text: string; error?: string }> {
    const id = this.nextId++
    return new Promise((resolve) => {
      this.pending.set(id, (text, error) => resolve({ text, error }))
      this.ensureWorker().postMessage({ type: 'transcribe', id, audio, final, language: readSpeechLang() })
    })
  }

  private collected(): Float32Array {
    return join(this.chunks)
  }

  get listening(): boolean {
    return this.stream !== null
  }

  /**
   * Opens the microphone and sends every frame to `onFrame`.
   *
   * One place, because the switch and Mode Menyimak must not drift apart in how
   * they ask for the microphone or what they do with the audio. The promise is
   * the same either way: the samples go to a worker on this device and nowhere
   * else.
   */
  private async openMic(onFrame: (frame: Float32Array) => void): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      })
    } catch (error) {
      const name = error instanceof DOMException ? error.name : ''
      throw new Error(
        name === 'NotAllowedError'
          ? 'Izin mikrofon ditolak. Izinkan lewat ikon gembok di bilah alamat.'
          : name === 'NotFoundError'
            ? 'Tidak ada mikrofon yang terpasang.'
            : 'Mikrofon tidak bisa dibuka.',
      )
    }
    // The browser resamples to 16 kHz for us, which is what Whisper expects.
    const context = new AudioContext({ sampleRate: SAMPLE_RATE })
    this.context = context
    const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }))
    await context.audioWorklet.addModule(url)
    URL.revokeObjectURL(url)
    const source = context.createMediaStreamSource(this.stream)
    const node = new AudioWorkletNode(context, 'karsa-capture')
    node.port.onmessage = (event: MessageEvent<Float32Array>) => onFrame(event.data)
    source.connect(node)
  }

  /** Opens the microphone. Throws with a sentence a person can act on. */
  async start(onPartial: (text: string) => void): Promise<void> {
    if (this.stream) return
    this.chunks = []
    await this.openMic((frame) => this.chunks.push(frame))

    this.partialTimer = window.setInterval(() => {
      if (this.busy || this.status.phase !== 'ready') return
      const audio = this.collected()
      if (audio.length < MIN_SAMPLES) return
      this.busy = true
      void this.transcribe(audio, false).then(({ text }) => {
        this.busy = false
        if (this.stream && text) onPartial(text)
      })
    }, PARTIAL_EVERY_MS)
  }

  /** Closes the microphone and returns the final transcript. */
  async stop(): Promise<{ text: string; error?: string }> {
    if (this.partialTimer !== null) window.clearInterval(this.partialTimer)
    this.partialTimer = null
    this.stream?.getTracks().forEach((track) => track.stop())
    this.stream = null
    await this.context?.close().catch(() => undefined)
    this.context = null

    const audio = this.collected()
    this.chunks = []
    if (audio.length < MIN_SAMPLES) return { text: '', error: 'Tidak ada suara yang terekam.' }
    if (this.status.phase === 'loading') {
      await new Promise<void>((resolve) => {
        const off = this.subscribe((s) => {
          if (s.phase !== 'loading') {
            off()
            resolve()
          }
        })
      })
    }
    if (this.status.phase !== 'ready') return { text: '', error: this.status.detail }
    return this.transcribe(audio, true)
  }

  /*
    ---- Mode Menyimak -------------------------------------------------------

    The microphone stays open and the voice detector decides where one sentence
    ends and the next begins. D4 kept "is speaking" on the talk switch and said
    an always-listening mode would arrive later as a deliberate choice; this is
    it, and it is a choice, not a default.

    The privacy promise does not change and is still one sentence: the audio
    goes to two workers on this device and nowhere else. What changes is who
    decides when a sentence started -- a model instead of a thumb -- which is
    the difference between speaking and having a hand free to press something.
  */
  private vad: Worker | null = null
  private watching = false
  private heard: Float32Array[] = []
  private recent: Float32Array[] = []
  private recentLength = 0
  private capturing = false

  get listeningMode(): boolean {
    return this.watching
  }

  private ensureVad(onError: (message: string) => void): Worker {
    if (this.vad) return this.vad
    const worker = new Worker(new URL('./vad.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event) => {
      const m = event.data
      if (m.type === 'speech') this.onSpeech(m.active)
      else if (m.type === 'error') onError(m.detail ?? m.message)
    }
    this.vad = worker
    return worker
  }

  private onSpeechStart: (() => void) | null = null
  private onUtterance: ((text: string) => void) | null = null

  private onSpeech(active: boolean): void {
    if (!this.watching) return
    if (active) {
      // Start from the pre-roll, so the word that woke the detector is in it.
      this.heard = [...this.recent]
      this.capturing = true
      this.onSpeechStart?.()
      return
    }
    if (!this.capturing) return
    this.capturing = false
    const audio = join(this.heard)
    this.heard = []
    if (audio.length < MIN_SAMPLES) return
    if (this.status.phase !== 'ready') return
    void this.transcribe(audio, true).then(({ text }) => {
      if (this.watching && text.trim()) this.onUtterance?.(text.trim())
    })
  }

  /**
   * Opens the microphone and reports whole sentences as they finish.
   *
   * Nothing is acted on here. What comes back is words; whether those words
   * were meant for the board is decided by `trigger.ts`, away from the audio.
   */
  async watch(handlers: {
    onUtterance: (text: string) => void
    onSpeechStart?: () => void
    onError: (message: string) => void
  }): Promise<void> {
    if (this.watching || this.stream) return
    this.onUtterance = handlers.onUtterance
    this.onSpeechStart = handlers.onSpeechStart ?? null
    this.heard = []
    this.recent = []
    this.recentLength = 0
    this.capturing = false

    const vad = this.ensureVad(handlers.onError)
    vad.postMessage({ type: 'reset' })
    vad.postMessage({ type: 'load', model: modelFile(VAD_MODEL), quietMs: QUIET_MS })

    await this.openMic((frame) => {
      vad.postMessage({ type: 'audio', samples: frame })
      if (this.capturing) {
        this.heard.push(frame)
        // A monologue must not grow without end; drop the oldest instead.
        let total = this.heard.reduce((n, c) => n + c.length, 0)
        while (total > MAX_SAMPLES && this.heard.length > 1) {
          total -= (this.heard.shift() as Float32Array).length
        }
        return
      }
      this.recent.push(frame)
      this.recentLength += frame.length
      while (this.recentLength > PREROLL_SAMPLES && this.recent.length > 1) {
        this.recentLength -= (this.recent.shift() as Float32Array).length
      }
    })
    this.watching = true
  }

  /** Closes the microphone and stops listening. */
  unwatch(): void {
    this.watching = false
    this.capturing = false
    this.heard = []
    this.recent = []
    this.recentLength = 0
    this.onUtterance = null
    this.onSpeechStart = null
    this.vad?.postMessage({ type: 'reset' })
    this.stream?.getTracks().forEach((track) => track.stop())
    this.stream = null
    void this.context?.close().catch(() => undefined)
    this.context = null
  }

  /** Turned off without a result, e.g. when leaving the room mid-sentence. */
  cancel(): void {
    this.unwatch()
    if (this.partialTimer !== null) window.clearInterval(this.partialTimer)
    this.partialTimer = null
    this.stream?.getTracks().forEach((track) => track.stop())
    this.stream = null
    void this.context?.close().catch(() => undefined)
    this.context = null
    this.chunks = []
  }
}

/** One per tab. The model is large; loading it twice would be a waste of memory. */
export const recogniser = new SpeechRecogniser()
