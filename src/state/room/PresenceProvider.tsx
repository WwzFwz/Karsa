/**
 * Who is here, and what each person is talking about or pointing at.
 *
 * Presence, not document: it is ephemeral, never undone and never logged. It
 * comes from Yjs Awareness through the server; without a server it is only you.
 *
 * Other people's arrivals, departures and pointing get a short earcon and one
 * sentence (rules 6 and 9). Talking does not: the ring on the avatar says it,
 * and narrating every time somebody starts speaking would talk over them.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react'
import { useAnnouncer } from '../../a11y/Announcer'
import { audioBus } from '../../audio/bus'
import { tr } from '../../core/i18n'
import type { NodeId, Participant } from '../../core/model/types'
import type { Connection, PresenceChange } from '../../store/presence'
import { useDocument } from './DocumentProvider'

export type { Connection }

export interface PresenceApi {
  participants: Participant[]
  selfId: string
  /** Whether changes are reaching other people right now. */
  connection: Connection
  /** This device's own presence: talking, focus, mode. */
  updateSelf: (patch: Partial<Pick<Participant, 'talking' | 'focusNodeId' | 'pointingNodeId' | 'mode'>>) => void
  /** "This one", as a node id, never as a coordinate. */
  pointAt: (id: NodeId | null) => void
}

const PresenceContext = createContext<PresenceApi | null>(null)

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { store, doc } = useDocument()
  const announcer = useAnnouncer()
  const presence = store.presence
  const snapshot = useSyncExternalStore(presence.subscribe, presence.getSnapshot, presence.getSnapshot)

  const pointAt = useCallback(
    (id: NodeId | null) => {
      presence.pointAt(id)
      if (id) announcer.announce(tr(`Anda menunjuk ${doc.nodes[id]?.title ?? 'sebuah simpul'}.`, `You point at ${doc.nodes[id]?.title ?? 'a node'}.`))
    },
    [presence, announcer, doc.nodes],
  )

  // Read through a ref so the subscription is made once per store (D74).
  const hear = useRef((_changes: PresenceChange[]) => {})
  hear.current = (changes) => {
    for (const change of changes) {
      const name = change.person.displayName
      if (change.type === 'joined') {
        announcer.announce(tr(`${name} bergabung.`, `${name} joined.`))
        audioBus.emit({ earcon: 'peerJoined', hue: change.person.hue })
      } else if (change.type === 'left') {
        announcer.announce(tr(`${name} keluar.`, `${name} left.`))
        audioBus.emit({ earcon: 'peerLeft', hue: change.person.hue })
      } else {
        const title = store.getDoc().nodes[change.nodeId]?.title ?? tr('sebuah simpul', 'a node')
        announcer.announce(tr(`${name} menunjuk ${title}.`, `${name} points at ${title}.`))
        audioBus.emit({ earcon: 'peerPointed', hue: change.person.hue })
      }
    }
  }
  useEffect(() => presence.subscribeChanges((changes) => hear.current(changes)), [presence])

  const api: PresenceApi = {
    participants: snapshot.participants,
    selfId: snapshot.selfId,
    connection: snapshot.connection,
    updateSelf: presence.updateSelf,
    pointAt,
  }

  return <PresenceContext.Provider value={api}>{children}</PresenceContext.Provider>
}

export function usePresence(): PresenceApi {
  const ctx = useContext(PresenceContext)
  if (!ctx) throw new Error('usePresence must be used inside RoomProvider')
  return ctx
}
