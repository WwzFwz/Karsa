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
import { CONFIG } from '../../core/config'

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

export const SPEECH_LANG_SHORT: Record<SpeechLang, string> = { auto: 'AUTO', id: 'ID', en: 'EN' }

/** The cycle behind the dock chip: the two real languages first, auto last. */
export const SPEECH_LANG_CYCLE: SpeechLang[] = ['id', 'en', 'auto']

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
    and the dock chip makes changing it one press.
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
    const length = this.chunks.reduce((n, c) => n + c.length, 0)
    const out = new Float32Array(length)
    let at = 0
    for (const chunk of this.chunks) {
      out.set(chunk, at)
      at += chunk.length
    }
    return out
  }

  get listening(): boolean {
    return this.stream !== null
  }

  /** Opens the microphone. Throws with a sentence a person can act on. */
  async start(onPartial: (text: string) => void): Promise<void> {
    if (this.stream) return
    this.chunks = []
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
    node.port.onmessage = (event: MessageEvent<Float32Array>) => this.chunks.push(event.data)
    source.connect(node)

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

  /** Turned off without a result, e.g. when leaving the room mid-sentence. */
  cancel(): void {
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

/*
  Voice answers to a standing proposal (D4c). Short and deliberately narrow:
  anything that is not clearly yes or no is read as a new instruction instead,
  because applying on a misheard "ya" is the one mistake that lands on everyone.
*/
const YES = /^(ya|iya|oke|ok|okay|setuju|terapkan|lanjut|boleh|betul|benar|siap|yes|yeah|yep|sure|apply|go ahead|do it|correct)\b/
const NO = /^(tidak|nggak|enggak|gak|jangan|batal|batalkan|buang|tolak|bukan|no|nope|cancel|discard|dont|stop)\b/

/**
 * Which option an answer names, or null. Numbers first ("yang kedua", "nomor
 * 2", "the second one"), then an option whose words were said -- but only when
 * exactly one option is clearly the best match, because picking the wrong
 * option on a shared canvas is the guess section 8 forbids.
 */
const ORDINALS: [RegExp, number][] = [
  [/\b(1|satu|pertama|kesatu|first|one)\b/, 0],
  [/\b(2|dua|kedua|second|two)\b/, 1],
  [/\b(3|tiga|ketiga|third|three)\b/, 2],
  [/\b(4|empat|keempat|fourth|four)\b/, 3],
]

export function pickChoice(transcript: string, choices: { id: string; label: string }[]): string | null {
  if (choices.length === 0) return null
  const text = transcript.toLowerCase().replace(/[.,!?"]/g, ' ').replace(/\s+/g, ' ').trim()
  // A short answer with a number in it is a number answer.
  if (text.split(' ').length <= 5) {
    for (const [pattern, index] of ORDINALS) {
      if (pattern.test(text) && choices[index]) return choices[index].id
    }
  }
  const said = new Set(text.split(' ').filter((w) => w.length >= 4))
  const scores = choices.map((c) => {
    const words = c.label.toLowerCase().replace(/[.,!?"]/g, ' ').split(/\s+/).filter((w) => w.length >= 4)
    const hits = words.filter((w) => said.has(w)).length
    return words.length ? hits / words.length : 0
  })
  const best = Math.max(...scores)
  const winners = scores.filter((s) => s === best).length
  return best >= 0.5 && winners === 1 ? choices[scores.indexOf(best)].id : null
}

export function readAnswer(transcript: string): 'yes' | 'no' | null {
  const text = transcript.toLowerCase().replace(/[.,!?]/g, ' ').replace(/\s+/g, ' ').trim()
  if (text.split(' ').length > 5) return null
  if (NO.test(text)) return 'no'
  if (YES.test(text)) return 'yes'
  return null
}
