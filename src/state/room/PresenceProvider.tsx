/**
 * Who is here, and what each person is talking about or pointing at.
 *
 * Presence, not document: it is ephemeral, never undone and never logged. The
 * participants still come from sample data; Awareness replaces that source
 * without changing this interface.
 */

import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from 'react'
import { useAnnouncer } from '../../a11y/Announcer'
import type { NodeId, Participant } from '../../core/model/types'
import { useDocument } from './DocumentProvider'

export interface PresenceApi {
  participants: Participant[]
  selfId: string
  /** This device's own presence: talking, focus, mode. */
  updateSelf: (patch: Partial<Omit<Participant, 'actorId'>>) => void
  /** "This one", as a node id, never as a coordinate. */
  pointAt: (id: NodeId | null) => void
}

const PresenceContext = createContext<PresenceApi | null>(null)

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { store, doc } = useDocument()
  const announcer = useAnnouncer()
  const presence = useSyncExternalStore(store.subscribePresence, store.getPresence, store.getPresence)

  const pointAt = useCallback(
    (id: NodeId | null) => {
      store.pointAt(id)
      if (id) announcer.announce(`Anda menunjuk ${doc.nodes[id]?.title ?? 'sebuah simpul'}.`)
    },
    [store, announcer, doc.nodes],
  )

  const api: PresenceApi = {
    participants: presence.participants,
    selfId: presence.selfId,
    updateSelf: store.updateSelf,
    pointAt,
  }

  return <PresenceContext.Provider value={api}>{children}</PresenceContext.Provider>
}

export function usePresence(): PresenceApi {
  const ctx = useContext(PresenceContext)
  if (!ctx) throw new Error('usePresence must be used inside RoomProvider')
  return ctx
}
