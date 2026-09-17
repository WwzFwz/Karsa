/**
 * Light and dark, with a real choice rather than only whatever the operating
 * system says.
 *
 * Three states, not two. "system" is the default because it is what most people
 * want; the explicit values exist because a lecture hall projector and a dim
 * room disagree, and a person should be able to say which they are in without
 * changing an OS setting mid-meeting.
 *
 * The chosen value is written to data-theme on <html>, which every token block
 * in styles.css keys off.
 */

import { useCallback, useEffect, useState } from 'react'

export type ThemeChoice = 'system' | 'light' | 'dark'

const KEY = 'karsa:tema'

function read(): ThemeChoice {
  try {
    const value = localStorage.getItem(KEY)
    if (value === 'light' || value === 'dark' || value === 'system') return value
  } catch {
    // Private browsing or blocked storage. The default is fine.
  }
  return 'system'
}

function apply(choice: ThemeChoice): void {
  const root = document.documentElement
  if (choice === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', choice)
}

/** What the person would actually see right now. */
export function resolved(choice: ThemeChoice): 'light' | 'dark' {
  if (choice !== 'system') return choice
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(read)

  useEffect(() => {
    apply(choice)
    try {
      localStorage.setItem(KEY, choice)
    } catch {
      // Not being able to remember the choice is not a reason to ignore it.
    }
  }, [choice])

  // Follow the system while the person has not overridden it.
  useEffect(() => {
    if (choice !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply('system')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [choice])

  const toggle = useCallback(() => {
    setChoice((current) => (resolved(current) === 'dark' ? 'light' : 'dark'))
  }, [])

  return { choice, setChoice, toggle, active: resolved(choice) }
}
