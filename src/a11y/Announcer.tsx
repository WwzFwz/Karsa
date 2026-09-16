/**
 * Our own announcement queue, sitting in front of the live region.
 *
 * aria-live="polite" waits for a gap in the *screen reader*, which is not the
 * same thing as a gap in the *meeting*. Rule 9 asks for the second one, so the
 * queue holds sentences while someone is talking, folds a burst of changes into
 * one sentence, and only then writes into the live region.
 *
 * We never speak. The person's own screen reader or braille display does.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { tr } from '../core/i18n'

export type AnnouncePriority = 'polite' | 'assertive'

interface Queued {
  text: string
  priority: AnnouncePriority
}

const COALESCE_MS = 700
/** Never sit on a message longer than this, even if talking continues. */
const MAX_HOLD_MS = 6000

export interface AnnouncerApi {
  announce: (text: string, priority?: AnnouncePriority) => void
  /** Push several sentences that should collapse into one if they pile up. */
  announceBurst: (text: string) => void
  setSpeechActive: (active: boolean) => void
  politeText: string
  assertiveText: string
  /** What the queue is holding right now, shown in the interface for sighted review. */
  held: number
}

const AnnouncerContext = createContext<AnnouncerApi | null>(null)

export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [politeText, setPoliteText] = useState('')
  const [assertiveText, setAssertiveText] = useState('')
  const [held, setHeld] = useState(0)

  const queue = useRef<Queued[]>([])
  const speaking = useRef(false)
  const firstQueuedAt = useRef<number | null>(null)
  const timer = useRef<number | null>(null)

  const api = useMemo<AnnouncerApi>(() => {
    const flush = () => {
      const items = queue.current
      if (items.length === 0) return

      const assertive = items.filter((i) => i.priority === 'assertive')
      const polite = items.filter((i) => i.priority === 'polite')
      queue.current = []
      firstQueuedAt.current = null
      setHeld(0)

      if (assertive.length > 0) {
        setAssertiveText(assertive.map((i) => i.text).join(' '))
      }
      if (polite.length === 1) {
        setPoliteText(polite[0].text)
      } else if (polite.length > 1) {
        // Rule 9: a burst becomes one sentence rather than five.
        setPoliteText(`${tr(`${polite.length} perubahan.`, `${polite.length} changes.`)} ${polite[polite.length - 1].text}`)
      }
    }

    const schedule = () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        const waitedTooLong =
          firstQueuedAt.current !== null && Date.now() - firstQueuedAt.current > MAX_HOLD_MS
        if (speaking.current && !waitedTooLong) {
          schedule()
          return
        }
        flush()
      }, COALESCE_MS)
    }

    const push = (text: string, priority: AnnouncePriority) => {
      if (!text) return
      if (firstQueuedAt.current === null) firstQueuedAt.current = Date.now()
      queue.current.push({ text, priority })
      setHeld(queue.current.length)
      // Assertive messages are the ones a person must not miss, such as a
      // merge conflict. They still wait for a gap, just a shorter one.
      if (priority === 'assertive' && !speaking.current) flush()
      else schedule()
    }

    return {
      announce: (text, priority = 'polite') => push(text, priority),
      announceBurst: (text) => push(text, 'polite'),
      setSpeechActive: (active) => {
        speaking.current = active
        if (!active) schedule()
      },
      politeText,
      assertiveText,
      held,
    }
  }, [politeText, assertiveText, held])

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current)
  }, [])

  return (
    <AnnouncerContext.Provider value={api}>
      {children}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {politeText}
      </div>
      <div className="sr-only" aria-live="assertive" aria-atomic="true" role="alert">
        {assertiveText}
      </div>
    </AnnouncerContext.Provider>
  )
}

export function useAnnouncer(): AnnouncerApi {
  const ctx = useContext(AnnouncerContext)
  if (!ctx) throw new Error('useAnnouncer must be used inside AnnouncerProvider')
  return ctx
}
