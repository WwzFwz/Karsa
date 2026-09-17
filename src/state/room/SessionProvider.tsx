/**
 * How this person is attending the meeting: meeting or review mode, how much
 * sound they hear, and audio traversal of the tree.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useAnnouncer } from '../../a11y/Announcer'
import { audioBus } from '../../audio/bus'
import type { SoundProfile } from '../../audio/earcons'
import { useDocument } from './DocumentProvider'
import { usePresence } from './PresenceProvider'
import { useView } from './ViewProvider'

export type SessionMode = 'meeting' | 'review'

export interface SessionApi {
  mode: SessionMode
  setMode: (mode: SessionMode) => void
  soundProfile: SoundProfile
  setSoundProfile: (profile: SoundProfile) => void
  traversing: boolean
  toggleTraversal: () => void
  traversalIndex: number
}

const SessionContext = createContext<SessionApi | null>(null)

/** How long each node sounds during traversal. */
const TRAVERSE_STEP_MS = 1400

export function SessionProvider({ children }: { children: ReactNode }) {
  const { tree } = useDocument()
  const { updateSelf } = usePresence()
  const { visibleIds, focusId, setFocus } = useView()
  const announcer = useAnnouncer()

  const [mode, setModeState] = useState<SessionMode>('meeting')
  const [soundProfile, setSoundProfile] = useState<SoundProfile>('sparse')
  const [traversing, setTraversing] = useState(false)
  const [traversalIndex, setTraversalIndex] = useState(0)

  useEffect(() => {
    audioBus.setProfile(soundProfile)
    audioBus.setMuted(soundProfile === 'silent')
  }, [soundProfile])

  const setMode = useCallback(
    (next: SessionMode) => {
      setModeState(next)
      updateSelf({ mode: next })
      setSoundProfile(next === 'review' ? 'full' : 'sparse')
      announcer.announce(next === 'review' ? 'Mode telaah. Bunyi penuh.' : 'Mode rapat. Bunyi ditekan.')
    },
    [updateSelf, announcer],
  )

  const toggleTraversal = useCallback(() => {
    setTraversing((on) => {
      announcer.announce(on ? 'Telusur audio berhenti.' : 'Telusur audio dimulai.')
      return !on
    })
  }, [announcer])

  /*
    One tone per node, pitch by depth, starting from the focus. The walk moves
    the focus along without its own earcon, so each node is heard once.

    Everything the walk reads comes through a ref and the effect depends only
    on `traversing`. Moving the focus, and every announcement (the announcer
    object changes with each one), would otherwise restart the walk from the
    focused node on every step -- the same trap as D74.
  */
  const walk = useRef({ visibleIds, tree, focusId, setFocus, announcer })
  walk.current = { visibleIds, tree, focusId, setFocus, announcer }

  useEffect(() => {
    if (!traversing) return
    const start = walk.current
    let index = Math.max(0, start.visibleIds.indexOf(start.focusId ?? ''))
    setTraversalIndex(index)
    const timer = window.setInterval(() => {
      const now = walk.current
      if (index >= now.visibleIds.length) {
        setTraversing(false)
        now.announcer.announce('Telusur audio selesai.')
        return
      }
      const id = now.visibleIds[index]
      const entry = now.tree.byId.get(id)
      if (entry) {
        audioBus.emit({ earcon: 'traverse', depth: entry.depth, force: true })
        now.announcer.announce(`Tingkat ${entry.depth + 1}. ${entry.node.title}.`)
        now.setFocus(id, { announce: false })
      }
      setTraversalIndex(index)
      index += 1
    }, TRAVERSE_STEP_MS)
    return () => window.clearInterval(timer)
  }, [traversing])

  const api: SessionApi = {
    mode,
    setMode,
    soundProfile,
    setSoundProfile,
    traversing,
    toggleTraversal,
    traversalIndex,
  }

  return <SessionContext.Provider value={api}>{children}</SessionContext.Provider>
}

export function useSession(): SessionApi {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside RoomProvider')
  return ctx
}
