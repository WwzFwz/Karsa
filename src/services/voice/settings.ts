/**
 * What this device has chosen about speech: which model, and which language.
 *
 * Preferences, not machinery. No microphone, no worker, no audio -- just what
 * one person picked, remembered in `localStorage` and readable from anywhere.
 * It is separate from `speech.ts` because the two change for entirely different
 * reasons: this changes when somebody visits Settings, that changes when the
 * recognition stack does.
 *
 * Language is a device preference and never enters the document (D69): two
 * people in the same room may hear the same change in two languages, because
 * the meaning is in the structure.
 */

import { CONFIG } from '../../core/config'
import { lang } from '../../core/i18n'

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
    // No model at all: a room with no microphone still gets to see the whole
    // loop work, which is what this is for.
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
    as the wrong language does not come back slightly wrong, it comes back as a
    different sentence. Following the output language is the better guess, and
    the sidebar language switch changes both at once.
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

export function writeSpeechLang(value: SpeechLang): void {
  try {
    localStorage.setItem(LANG_KEY, value)
  } catch {
    // Not remembered, still used for this session.
  }
}
