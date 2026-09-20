/**
 * Samples in, words out. The model side of speech, and nothing else.
 *
 * It owns the worker that runs Whisper, knows how far the download has got, and
 * turns a run of audio into a sentence. It has never heard of a microphone:
 * what hands it samples is `speech.ts`, and it would be just as happy with a
 * file. That is the seam -- one of these talks to a model, the other talks to
 * hardware, and they fail in completely different ways.
 *
 * Nothing leaves this device. The samples go to a worker in this tab and the
 * text comes back; that is the whole of the privacy promise, and it is short
 * enough to check by reading.
 */

import { CONFIG } from '../../core/config'
import { readSpeechLang, type AsrModelId } from './settings'

export interface AsrStatus {
  phase: 'idle' | 'loading' | 'ready' | 'error'
  percent: number
  detail: string
}

type Listener = (status: AsrStatus) => void

export class Transcriber {
  private worker: Worker | null = null
  private status: AsrStatus = { phase: 'idle', percent: 0, detail: 'Belum dimuat.' }
  private listeners = new Set<Listener>()
  private model: AsrModelId = CONFIG.asrModel
  private nextId = 1
  private pending = new Map<number, (text: string, error?: string) => void>()
  /** Called with the text so far, while a request is still decoding. */
  private streaming = new Map<number, (text: string) => void>()

  getStatus(): AsrStatus {
    return this.status
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
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
    this.ensure().postMessage({ type: 'load', model })
  }

  /**
   * One run of samples into one sentence.
   *
   * `final` marks the end of an utterance rather than one of the partials that
   * stream while somebody is still talking -- and streaming partials is most of
   * why three seconds feels like none (section 10).
   */
  transcribe(
    audio: Float32Array,
    final: boolean,
    /** Called as words are decoded, before the sentence is finished. */
    onPartial?: (text: string) => void,
  ): Promise<{ text: string; error?: string }> {
    const id = this.nextId++
    return new Promise((resolve) => {
      if (onPartial) this.streaming.set(id, onPartial)
      this.pending.set(id, (text, error) => {
        this.streaming.delete(id)
        resolve({ text, error })
      })
      this.ensure().postMessage({ type: 'transcribe', id, audio, final, language: readSpeechLang() })
    })
  }

  /** Waits out a download in progress, so a sentence is not thrown away. */
  async settled(): Promise<AsrStatus> {
    if (this.status.phase !== 'loading') return this.status
    await new Promise<void>((resolve) => {
      const off = this.subscribe((s) => {
        if (s.phase !== 'loading') {
          off()
          resolve()
        }
      })
    })
    return this.status
  }

  private setStatus(status: AsrStatus) {
    this.status = status
    this.listeners.forEach((l) => l(status))
  }

  private ensure(): Worker {
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
      } else if (m.type === 'partial') {
        this.streaming.get(m.id)?.(m.text)
      } else if (m.type === 'result') {
        const resolve = this.pending.get(m.id)
        this.pending.delete(m.id)
        resolve?.(m.text, m.error)
      }
    }
    this.worker = worker
    return worker
  }
}
