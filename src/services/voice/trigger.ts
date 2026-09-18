/**
 * What counts as talking *to* Karsa, rather than talking in front of it.
 *
 * Mode Menyimak leaves the microphone open, and that changes the question the
 * system has to answer. With the talk switch, pressing it was the request; with
 * the microphone simply on, every sentence in the meeting arrives here and most
 * of them are not meant for the board. A room where "we should delete that"
 * deletes something is worse than a room with no voice at all.
 *
 * So the rule is the plainest one available: an utterance is a request only if
 * it is addressed by name. This is a pure function of the words, kept away from
 * the microphone and the model so it can be argued with and tested on its own.
 */

import { lang } from '../../core/i18n'

/**
 * The name, and the ways speech recognition tends to mangle it.
 *
 * Whisper writes a spoken "Karsa" as Karsa, Kursa, Carsa or Korsa often enough
 * that an exact match would make the mode feel broken while looking correct in
 * a test. These are misspellings of one name, not extra names: none of them is
 * an ordinary Indonesian or English word, so accepting them costs nothing.
 */
const NAMES = ['karsa', 'kursa', 'carsa', 'korsa', 'kasra']

/** Politeness that can sit before the name without changing the meaning. */
const BEFORE = ['hai', 'halo', 'hei', 'hey', 'hi', 'hello', 'oke', 'ok', 'okay', 'eh', 'tolong', 'please']

/**
 * Phrases that can sit after the name and are address, not instruction.
 *
 * Some are two words, so they are matched against the run of words rather than
 * one at a time -- "can you" only ever means this, and leaving half of it in
 * the request would hand the model a sentence nobody said.
 */
const AFTER = [['tolong'], ['please'], ['coba'], ['bisa'], ['can', 'you'], ['could', 'you'], ['ya'], ['dong'], ['deh']]

const clean = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export interface Addressed {
  /** What is left once the name and the politeness around it are removed. */
  request: string
  /** The name as it was actually heard, for the line that reports it. */
  heard: string
}

/**
 * Reads an utterance as a request addressed to Karsa, or returns null.
 *
 * The name has to come near the front. "Tambahkan ini, Karsa" would be natural
 * to say, but accepting a trailing name means the whole sentence has to be
 * heard before anybody knows whether it was a command -- and a sentence that
 * mentions the product in passing halfway through would become one.
 */
export function addressed(text: string): Addressed | null {
  const words = clean(text).split(' ').filter(Boolean)
  if (words.length === 0) return null

  let at = 0
  while (at < words.length && at < 2 && BEFORE.includes(words[at])) at += 1
  if (at >= words.length || !NAMES.includes(words[at])) return null

  const heard = words[at]
  at += 1
  for (;;) {
    const skip = AFTER.find((phrase) => phrase.every((word, i) => words[at + i] === word))
    if (!skip) break
    at += skip.length
  }

  const request = words.slice(at).join(' ').trim()
  // The name on its own is somebody getting the room's attention, not an
  // instruction. Answering it with a proposal would be inventing one.
  if (!request) return null
  return { request, heard }
}

/** The sentence shown where the mode is switched on, so the rule is visible. */
export function triggerHint(): string {
  return lang() === 'en'
    ? 'Say "Karsa" first, then what you want. Anything else is not acted on.'
    : 'Sebut "Karsa" dulu, baru maksudnya. Selain itu tidak dikerjakan.'
}
