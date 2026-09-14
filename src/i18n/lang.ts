/**
 * Output language: Indonesian or English.
 *
 * Deliberately tiny. The sentences that matter most -- what the canvas says
 * about every change, what the assistant proposes and why, what the voice turn
 * announces -- are written in both languages next to each other with `tr`, so
 * a new sentence cannot be added in one language and forgotten in the other.
 * A key-based catalogue would let exactly that happen quietly.
 *
 * The language is a preference of this device, like the theme. It never enters
 * the document: two people in the same room may hear the same change in two
 * languages, which rule 2's spirit already allows -- meaning lives in the
 * structure, not in any one rendering of it.
 */

import { useSyncExternalStore } from 'react'

export type Lang = 'id' | 'en'

const KEY = 'karsa:bahasa'

function read(): Lang {
  try {
    const value = localStorage.getItem(KEY)
    if (value === 'id' || value === 'en') return value
    // Indonesian until chosen otherwise. Following the browser would switch a
    // room to English for the many people here whose browser ships in English.
    return 'id'
  } catch {
    return 'id'
  }
}

let current: Lang = typeof window === 'undefined' ? 'id' : read()
const listeners = new Set<() => void>()

export function lang(): Lang {
  return current
}

export function setLang(next: Lang): void {
  current = next
  try {
    localStorage.setItem(KEY, next)
  } catch {
    // Not remembered, still used for this session.
  }
  document.documentElement.lang = next
  listeners.forEach((listener) => listener())
}

/** Both languages, side by side at the place the sentence is written. */
export function tr(id: string, en: string): string {
  return current === 'en' ? en : id
}

/**
 * A label table that answers in the current language. Getters, so the dozens
 * of places that already read `KIND_LABEL[kind]` switch language without being
 * touched.
 */
export function bilingual<K extends string>(id: Record<K, string>, en: Record<K, string>): Record<K, string> {
  const table = {} as Record<K, string>
  for (const key of Object.keys(id) as K[]) {
    Object.defineProperty(table, key, { enumerable: true, get: () => (current === 'en' ? en[key] : id[key]) })
  }
  return table
}

export function useLang(): Lang {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => current,
    () => current,
  )
}

/**
 * Turns one string field of an existing object into a getter that answers in
 * the current language. For registries whose labels are read in many places.
 */
export function localise<T extends object>(target: T, field: keyof T & string, en: string): void {
  const id = target[field] as unknown as string
  Object.defineProperty(target, field, {
    enumerable: true,
    configurable: true,
    get: () => (current === 'en' ? en : id),
  })
}
