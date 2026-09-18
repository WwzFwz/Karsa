/**
 * Voice activity detection, in its own worker (section 6).
 *
 * Silero VAD through ONNX Runtime Web, which is the stack section 8 names. It
 * answers one question about each 32 ms of audio -- is somebody speaking -- and
 * nothing else. No words leave here, because no words are formed here: this
 * model returns a single number.
 *
 * It exists so that speaking does not require a hand. D4 made the talk switch
 * the source of "is speaking" and said an always-listening mode would come
 * later as a deliberate choice; this is that mode's other half. The privacy
 * promise is kept by the same sentence as before -- the microphone is open only
 * while a mode the person switched on is running, and the audio never leaves
 * the device either way.
 *
 * The runtime and the model both come from this app's own origin, so a room on
 * a network with no way out can still hear (see scripts/prepare-ort.mjs).
 */

import * as ort from 'onnxruntime-web'

/** Silero works on exactly this many samples at a time, at 16 kHz. */
const WINDOW = 512
const SAMPLE_RATE = 16000

/*
  Two thresholds, not one.

  A single threshold makes the detector chatter on every breath and pause: the
  probability crosses back and forth and each crossing would start or end a
  sentence. Speech has to be clearly present to begin and clearly absent to
  end, which is the same hysteresis a noise gate uses.
*/
const START_AT = 0.5
const STOP_AT = 0.35

type Request =
  | { type: 'load'; model: string }
  | { type: 'audio'; samples: Float32Array }
  | { type: 'reset' }

const post = (message: unknown) => (self as unknown as Worker).postMessage(message)

let session: ort.InferenceSession | null = null
let loading: Promise<void> | null = null

/** Silero carries its own memory between windows; this is that memory. */
const emptyState = () => new ort.Tensor('float32', new Float32Array(2 * 1 * 128), [2, 1, 128])
let state = emptyState()
const rate = new ort.Tensor('int64', BigInt64Array.from([BigInt(SAMPLE_RATE)]), [])

/** Samples that arrived but did not fill a window yet. */
let carry = new Float32Array(0)
let speaking = false
/** How long the probability has stayed low, in samples, while speech was on. */
let quiet = 0
/** How long it must stay low before the sentence is called finished. */
let quietLimit = SAMPLE_RATE * 0.7

async function load(model: string): Promise<void> {
  if (session) return
  if (loading) return loading
  loading = (async () => {
    // The runtime this app ships, never a CDN: mode kelas has no internet.
    ort.env.wasm.wasmPaths = new URL('/ort/', self.location.origin).href
    session = await ort.InferenceSession.create(model, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    })
    post({ type: 'ready' })
  })()
  try {
    await loading
  } catch (error) {
    session = null
    post({ type: 'error', message: error instanceof Error ? error.message : String(error) })
  } finally {
    loading = null
  }
}

function reset(): void {
  state = emptyState()
  carry = new Float32Array(0)
  speaking = false
  quiet = 0
}

async function feed(samples: Float32Array): Promise<void> {
  if (!session) return
  const joined = new Float32Array(carry.length + samples.length)
  joined.set(carry)
  joined.set(samples, carry.length)

  let at = 0
  while (at + WINDOW <= joined.length) {
    const window = joined.subarray(at, at + WINDOW)
    at += WINDOW
    const output = await session.run({
      input: new ort.Tensor('float32', window, [1, WINDOW]),
      sr: rate,
      state,
    })
    // The model hands its memory back for the next window to carry on from.
    state = output.stateN as typeof state
    const probability = (output.output.data as Float32Array)[0]

    if (!speaking) {
      if (probability >= START_AT) {
        speaking = true
        quiet = 0
        post({ type: 'speech', active: true })
      }
      continue
    }
    if (probability < STOP_AT) {
      quiet += WINDOW
      if (quiet >= quietLimit) {
        speaking = false
        quiet = 0
        post({ type: 'speech', active: false })
      }
    } else {
      quiet = 0
    }
  }
  carry = joined.slice(at)
}

/*
  One request at a time.

  Audio arrives faster than the model runs on a slow machine. Queuing it would
  put the detector further and further behind the speaker, and a sentence that
  is reported as finished four seconds late is worse than one window skipped --
  the same trade the transcriber already makes (D65).
*/
let busy = false

self.onmessage = async (event: MessageEvent<Request & { quietMs?: number }>) => {
  const message = event.data
  if (message.type === 'load') {
    if (typeof message.quietMs === 'number') quietLimit = (SAMPLE_RATE * message.quietMs) / 1000
    await load(message.model)
    return
  }
  if (message.type === 'reset') {
    reset()
    return
  }
  if (message.type === 'audio') {
    if (busy) return
    busy = true
    try {
      await feed(message.samples)
    } catch (error) {
      post({ type: 'error', message: error instanceof Error ? error.message : String(error) })
    } finally {
      busy = false
    }
  }
}
