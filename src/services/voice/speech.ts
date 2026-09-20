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

import { hasExplicitSpeechLang, type AsrModelId } from './settings'
import { VoiceDetector } from './vad'
import { Transcriber, type AsrStatus } from './transcriber'
import { modelUrl } from '../../core/config'

/*
  Which model and which language are preferences, not machinery: `settings.ts`.
  Re-exported here so the rest of the app keeps one door into speech.
*/
export {
  ASR_MODES,
  hasExplicitSpeechLang,
  readAsrMode,
  readSpeechLang,
  writeAsrMode,
  writeSpeechLang,
  type AsrMode,
  type AsrModelId,
  type SpeechLang,
} from './settings'

/**
 * Keeps the microphone on the language the app is speaking, until somebody
 * splits them on purpose in Settings. One switch, two things, no surprise.
 *
 * It lives here rather than with the other settings because it has to nudge the
 * running recogniser, and a preference is not allowed to know that exists.
 */
export function followOutputLanguage(): void {
  if (!hasExplicitSpeechLang()) recogniser.retune()
}

export type { AsrStatus } from './transcriber'

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
  /*
    Two collaborators, each owning a worker and each failing its own way: one
    turns samples into words, the other says where a sentence stops. What stays
    here is the microphone and the buffers between them.
  */
  private readonly asr = new Transcriber()
  private readonly vad = new VoiceDetector()

  private stream: MediaStream | null = null
  private context: AudioContext | null = null
  private chunks: Float32Array[] = []
  private partialTimer: number | null = null
  private busy = false

  /* Forwarded, so the rest of the app still has one door into speech. */
  getStatus = (): AsrStatus => this.asr.getStatus()
  subscribe = (listener: (status: AsrStatus) => void): (() => void) => this.asr.subscribe(listener)
  retune = (): void => this.asr.retune()
  load = (model: AsrModelId): void => this.asr.load(model)

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

    /*
      The transcript only ever grows.

      Each pass re-reads the whole buffer from the start, so the words it
      streams begin again from nothing every time. Showing that raw would wipe
      the line and retype it once a second, which reads as broken rather than
      as fast. So the settled text from the last finished pass stays on screen
      until the running pass has caught up with it, and after that the live
      words take over -- the line only ever moves forwards.
    */
    let settled = ''
    const show = (live: string) => {
      if (!this.stream) return
      const text = live.length >= settled.length ? live : settled
      if (text) onPartial(text)
    }

    this.partialTimer = window.setInterval(() => {
      if (this.busy || this.asr.getStatus().phase !== 'ready') return
      const audio = this.collected()
      if (audio.length < MIN_SAMPLES) return
      this.busy = true
      void this.asr.transcribe(audio, false, show).then(({ text }) => {
        this.busy = false
        if (text) settled = text
        show(text)
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
    const status = await this.asr.settled()
    if (status.phase !== 'ready') return { text: '', error: status.detail }
    return this.asr.transcribe(audio, true)
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
  private watching = false
  private heard: Float32Array[] = []
  private recent: Float32Array[] = []
  private recentLength = 0
  private capturing = false

  get listeningMode(): boolean {
    return this.watching
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
    if (this.asr.getStatus().phase !== 'ready') return
    void this.asr.transcribe(audio, true).then(({ text }) => {
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

    this.vad.listen(modelFile(VAD_MODEL), QUIET_MS, {
      onSpeech: (active) => this.onSpeech(active),
      onError: handlers.onError,
    })

    await this.openMic((frame) => {
      this.vad.feed(frame)
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
    this.vad.stop()
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
