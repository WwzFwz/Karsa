/**
 * The audio bus.
 *
 * This is how rules 6 and 9 stay compatible. Every feature emits into the bus,
 * which satisfies "every feature produces an audio event". The sound profile
 * then decides what is actually audible, which satisfies "silent by default".
 * A feature is never allowed to call the player directly.
 */

import { EarconPlayer, waveFor, type EarconName, type SoundProfile, EARCONS } from './earcons'

export interface AudioEvent {
  earcon: EarconName
  /** Tree depth, mapped to pitch. */
  depth?: number
  /** Hue of whoever caused it, mapped to timbre. */
  hue?: number
  /** Bypass the profile filter. Used only for the person's own confirmation. */
  force?: boolean
}

export class AudioBus {
  private player = new EarconPlayer()
  private profile: SoundProfile = 'sparse'
  private muted = false

  setProfile(profile: SoundProfile): void {
    this.profile = profile
  }

  getProfile(): SoundProfile {
    return this.profile
  }

  setMuted(muted: boolean): void {
    this.muted = muted
  }

  isMuted(): boolean {
    return this.muted
  }

  emit(event: AudioEvent): void {
    if (this.muted) return
    if (!event.force) {
      if (this.profile === 'silent') return
      if (this.profile === 'sparse' && !EARCONS[event.earcon].important) return
    }
    this.player.play(event.earcon, {
      depth: event.depth ?? 0,
      wave: event.hue === undefined ? 'sine' : waveFor(event.hue),
    })
  }
}

export const audioBus = new AudioBus()
