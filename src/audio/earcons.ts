/**
 * Event sounds. Web Audio oscillators only -- no audio files anywhere.
 *
 * The vocabulary is designed, not decorative. Three dimensions carry meaning,
 * and each was chosen because it can be heard without training:
 *
 *   direction  rising = something appeared, falling = something went away
 *   pitch      depth in the tree; every level down is two semitones lower, so
 *              you can hear roughly where a change landed without a sentence
 *   timbre     who did it; each participant keeps one waveform for the session
 *
 * Everything is under 180 ms and sits above the speech band, so a burst of
 * changes does not collide with the meeting. See docs/sound-vocabulary.md.
 */

import type { EventType } from '../core/events/types'

export type SoundProfile = 'silent' | 'sparse' | 'full'

export interface EarconSpec {
  /** Semitone offsets from the base pitch, played in order. */
  steps: number[]
  /** Milliseconds per step. */
  step: number
  gain: number
  /** Play the steps together instead of one after another. */
  chord?: boolean
  /** Included in 'sparse' profile, which is the meeting default. */
  important: boolean
}

const BASE_HZ = 880

export const EARCONS: Record<
  | EventType
  | 'focus'
  | 'traverse'
  | 'draftReady'
  | 'blocked'
  | 'joinRequest'
  | 'joinAccepted'
  | 'joinDeclined',
  EarconSpec
> = {
  createNode: { steps: [0, 4], step: 55, gain: 0.16, important: true },
  deleteNode: { steps: [4, -3], step: 60, gain: 0.16, important: true },
  renameNode: { steps: [2, 2], step: 40, gain: 0.1, important: false },
  setNodeKind: { steps: [0, 2], step: 40, gain: 0.1, important: false },
  setNodeState: { steps: [0, 7], step: 50, gain: 0.13, important: true },
  setNodeNote: { steps: [1], step: 45, gain: 0.08, important: false },
  moveNode: { steps: [0, 5, 0], step: 42, gain: 0.14, important: true },
  reorderNode: { steps: [0, 1], step: 35, gain: 0.09, important: false },
  addRelation: { steps: [0, 7], step: 90, gain: 0.13, chord: true, important: true },
  removeRelation: { steps: [7, 0], step: 55, gain: 0.11, important: false },
  relabelRelation: { steps: [3], step: 45, gain: 0.08, important: false },
  addComment: { steps: [0, -5], step: 45, gain: 0.12, important: true },
  resolveComment: { steps: [-5, 0], step: 45, gain: 0.1, important: false },
  setRoomTitle: { steps: [0], step: 60, gain: 0.09, important: false },
  // A shape change moves everyone's canvas, so it gets a wide, unmistakable arc.
  setRoomShape: { steps: [0, 5, 9], step: 55, gain: 0.15, important: true },
  // Deliberately a minor second. It is meant to sound wrong, because it is.
  cycleResolved: { steps: [0, 1], step: 130, gain: 0.2, chord: true, important: true },
  // Falling then settling: the sound of something being put back.
  undo: { steps: [5, 0], step: 58, gain: 0.15, important: true },
  focus: { steps: [0], step: 22, gain: 0.05, important: false },
  traverse: { steps: [0], step: 32, gain: 0.09, important: true },
  draftReady: { steps: [0, 12], step: 60, gain: 0.14, important: true },
  blocked: { steps: [0, -1], step: 90, gain: 0.16, chord: true, important: true },
  // Someone at the door. A repeated note, because that is what knocking is.
  joinRequest: { steps: [7, 7], step: 80, gain: 0.14, important: true },
  // Opening: a plain major triad going up, the most arrival-shaped thing there is.
  joinAccepted: { steps: [0, 4, 7], step: 45, gain: 0.14, important: true },
  // Turning away: down, and it does not settle on the note it started from.
  joinDeclined: { steps: [2, -5], step: 62, gain: 0.12, important: false },
}

export type EarconName = keyof typeof EARCONS

const WAVES: OscillatorType[] = ['sine', 'triangle', 'square', 'sawtooth']

/** Same person, same waveform, for the whole session. */
export function waveFor(hue: number): OscillatorType {
  return WAVES[Math.floor(hue / 90) % WAVES.length]
}

export function pitchFor(depth: number, semitoneOffset: number): number {
  return BASE_HZ * Math.pow(2, (semitoneOffset - depth * 2) / 12)
}

export class EarconPlayer {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.9
      this.master.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  play(name: EarconName, options: { depth?: number; wave?: OscillatorType; volume?: number } = {}): void {
    const ctx = this.ensure()
    if (!ctx || !this.master) return
    const spec = EARCONS[name]
    const depth = options.depth ?? 0
    const wave = options.wave ?? 'sine'
    const volume = options.volume ?? 1
    const start = ctx.currentTime

    spec.steps.forEach((semitone, index) => {
      const at = spec.chord ? start : start + (index * spec.step) / 1000
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = wave
      osc.frequency.value = pitchFor(depth, semitone)
      const peak = spec.gain * volume
      // Short attack and release: a click-free blip that never rings on.
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), at + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + spec.step / 1000)
      osc.connect(gain)
      gain.connect(this.master!)
      osc.start(at)
      osc.stop(at + spec.step / 1000 + 0.02)
    })
  }
}
