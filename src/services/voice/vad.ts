/**
 * The voice detector, as the rest of the app sees it.
 *
 * A thin thing on purpose: it owns the worker that runs Silero, hands it audio,
 * and reports one fact -- somebody started speaking, somebody stopped. No words
 * pass through here, because no words are formed here.
 *
 * Deciding *where* a sentence begins and ends is its job. Deciding what to do
 * with the sentence is `speech.ts` (buffering it) and `trigger.ts` (whether it
 * was addressed to Karsa at all). Keeping those three apart is what lets the
 * hardest of them -- the rule about who was spoken to -- be a pure function
 * with tests, while this one needs a browser to do anything at all.
 */

const WORKER = () => new Worker(new URL('./vad.worker.ts', import.meta.url), { type: 'module' })

export interface DetectorHandlers {
  /** Somebody started or stopped speaking. */
  onSpeech: (active: boolean) => void
  onError: (message: string) => void
}

export class VoiceDetector {
  private worker: Worker | null = null
  private handlers: DetectorHandlers | null = null

  /** Starts the model loading and points the detector at these handlers. */
  listen(model: string, quietMs: number, handlers: DetectorHandlers): void {
    this.handlers = handlers
    const worker = this.ensure()
    // A fresh start: the model carries memory between windows, and last
    // session's memory would decide this session's first sentence.
    worker.postMessage({ type: 'reset' })
    worker.postMessage({ type: 'load', model, quietMs })
  }

  /** Raw 16 kHz mono samples, straight from the capture worklet. */
  feed(samples: Float32Array): void {
    this.worker?.postMessage({ type: 'audio', samples })
  }

  /** Stops reporting and forgets where it was. The worker stays warm. */
  stop(): void {
    this.handlers = null
    this.worker?.postMessage({ type: 'reset' })
  }

  private ensure(): Worker {
    if (this.worker) return this.worker
    const worker = WORKER()
    worker.onmessage = (event) => {
      const m = event.data
      if (m.type === 'speech') this.handlers?.onSpeech(m.active)
      else if (m.type === 'error') this.handlers?.onError(m.message)
    }
    this.worker = worker
    return worker
  }
}
