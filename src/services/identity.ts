/**
 * Who this device is.
 *
 * No accounts: a random actor id is made once and kept on the device, so the
 * log can tell two people apart (D8) and a vote stays one person's vote (D42).
 * The display name is whatever the person typed when joining.
 */

import { newId } from '../core/model/ids'
import type { Actor } from '../core/model/types'

const KEY = 'karsa:aktor'

export function readSelfId(): string {
  try {
    const known = localStorage.getItem(KEY)
    if (known) return known
    const id = newId('a')
    localStorage.setItem(KEY, id)
    return id
  } catch {
    // Storage blocked: a new identity per visit is still better than a shared one.
    return newId('a')
  }
}

/** The same id always gets the same colour, on every device. */
export function hueFor(id: string): number {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return hash % 360
}

export function selfActor(displayName: string): Actor {
  const id = readSelfId()
  return { id, displayName, hue: hueFor(id) }
}
