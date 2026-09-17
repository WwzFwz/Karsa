/**
 * The shared document of one room, and the only door into it.
 *
 * Everything here changes what someone else's screen reader would read out:
 * commands, undo, templates, and the sentences and earcons those produce --
 * including for changes that arrive from another device.
 *
 * Navigation (focus, collapse, placement) lives in ViewProvider. It hears about
 * this device's changes through `subscribeApplied`, so the document never
 * reaches into view state.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { useParams } from 'react-router-dom'
import { useAnnouncer } from '../../a11y/Announcer'
import { audioBus } from '../../audio/bus'
import { narrate } from '../../core/events/narrate'
import { tr } from '../../core/i18n'
import type { Command, CommandResult } from '../../core/commands/types'
import type { DocEvent } from '../../core/events/types'
import type { Actor, InputPath, NodeId, RoomDoc } from '../../core/model/types'
import { suggestShape, type ShapeSuggestion } from '../../core/shape/suggest'
import { expandTemplate, templateSize } from '../../core/templates/expand'
import { templateById } from '../../core/templates/registry'
import { countVotes, hasVoted } from '../../core/tools/tally'
import { projectTree, type TreeProjection } from '../../core/tree/project'
import { selfActor } from '../../services/identity'
import { findRoom } from '../../services/rooms/rooms'
import { connectRoom } from '../../store/connectRoom'
import { buildEmptyDoc, buildSeedDoc } from '../../store/seed/room'
import { YjsDocStore } from '../../store/YjsDocStore'
import { useLang } from '../useLang'

/** The one room that carries the demo content. Everything else starts empty. */
const DEMO_ROOM = 'KUR-482'

export interface DocumentApi {
  /** For the other room providers only. Components read through hooks. */
  store: YjsDocStore
  self: Actor
  doc: RoomDoc
  tree: TreeProjection
  suggestion: ShapeSuggestion
  nameOf: (actorId: string) => string
  hueOf: (actorId: string) => number

  run: (command: Command, inputPath?: InputPath) => CommandResult
  /** Drops a whole template, as one undo step and one sentence (D44). */
  insertTemplate: (templateId: string, parentId: NodeId | null) => void
  undo: () => void
  canUndo: boolean
  /** Events this device just applied, for view state that follows them. */
  subscribeApplied: (listener: (events: DocEvent[]) => void) => () => void

  votedByMe: (id: NodeId) => boolean
  votesOn: (id: NodeId) => number

  lastError: string | null
  reportError: (message: string) => void
  clearError: () => void

  /** Forces the crossing-move situation Yjs cannot prevent, to hear the repair. */
  simulateConflict: () => void
}

const DocumentContext = createContext<DocumentApi | null>(null)

export function DocumentProvider({ selfName, children }: { selfName: string; children: ReactNode }) {
  const announcer = useAnnouncer()
  // Re-render everything that speaks when the output language changes.
  const language = useLang()
  const { roomId } = useParams()

  /*
    A room you just made must not open somebody else's meeting. Only the demo
    code carries the seeded content; any other room starts with its own name on
    a single root and nobody in it but you.
  */
  const self = useMemo(() => selfActor(selfName), [selfName])
  const room = roomId ?? DEMO_ROOM
  const store = useMemo(() => {
    return new YjsDocStore({
      initial: room === DEMO_ROOM
        ? buildSeedDoc(self)
        : buildEmptyDoc(room, findRoom(room)?.title ?? 'Ruang tanpa nama', self),
      self,
    })
  }, [self, room])

  // Opening the store is pure; connecting it is an effect, so a StrictMode
  // double run connects, disconnects and connects cleanly.
  useEffect(() => connectRoom(store, room), [store, room])

  const doc = useSyncExternalStore(store.subscribeDoc, store.getDoc, store.getDoc)
  const tree = useMemo(() => projectTree(doc), [doc])
  const suggestion = useMemo(() => suggestShape(doc, tree), [doc, tree])
  const [lastError, setLastError] = useState<string | null>(null)

  /*
    Read from the store, not from this render's `doc`: a change from another
    device can bring its author's name in the same update, and it is announced
    before React has rendered that update.
  */
  const nameOf = useCallback(
    (actorId: string) => {
      // "Anda" is a pronoun, not a name, so it is the one name that is translated.
      if (actorId === self.id) return tr('Anda', 'You')
      return store.getDoc().actors[actorId]?.displayName ?? tr('Seseorang', 'Someone')
    },
    [store, self.id, doc.actors, language],
  )
  const hueOf = useCallback(
    (actorId: string) => store.getDoc().actors[actorId]?.hue ?? 0,
    [store, doc.actors],
  )

  /** One sentence and one earcon per event, whoever made it (rule 5, rule 9). */
  const announceEvents = useCallback(
    (events: DocEvent[]) => {
      for (const event of events) {
        announcer.announce(narrate(event, nameOf(event.actorId)))
        audioBus.emit({
          earcon: event.type,
          depth: event.payload.nodeId ? tree.byId.get(event.payload.nodeId)?.depth ?? 0 : 0,
          hue: hueOf(event.actorId),
        })
      }
    },
    [announcer, nameOf, hueOf, tree],
  )

  /*
    Following a change as it happens is the gap this product exists for
    (section 1). A change made on another device gets exactly what a change
    made here gets. Read through a ref so the subscription is made once.
  */
  const announceRef = useRef(announceEvents)
  announceRef.current = announceEvents
  useEffect(() => store.subscribeRemoteEvents((events) => announceRef.current(events)), [store])

  // Announce and sound merge repairs. A cut is designed behaviour, not damage,
  // so it gets a name and a deliberately dissonant earcon rather than silence.
  const knownRepairs = useRef(new Set<string>())
  useEffect(() => {
    for (const repair of tree.repairs) {
      const key = `${repair.nodeId}:${repair.formerParentId}`
      if (knownRepairs.current.has(key)) continue
      knownRepairs.current.add(key)
      const title = doc.nodes[repair.nodeId]?.title ?? 'Sebuah simpul'
      announcer.announce(
        repair.reason === 'cycle'
          ? `Perpindahan bertabrakan. ${title} dikembalikan ke akar.`
          : `Induk ${title} hilang. Simpul dikembalikan ke akar.`,
        'assertive',
      )
      audioBus.emit({ earcon: 'cycleResolved', force: true })
    }
  }, [tree.repairs, doc.nodes, announcer])

  const appliedListeners = useRef(new Set<(events: DocEvent[]) => void>())
  const subscribeApplied = useCallback((listener: (events: DocEvent[]) => void) => {
    appliedListeners.current.add(listener)
    return () => {
      appliedListeners.current.delete(listener)
    }
  }, [])
  const applied = (events: DocEvent[]) => appliedListeners.current.forEach((l) => l(events))

  const refuse = useCallback(
    (message: string) => {
      setLastError(message)
      announcer.announce(message, 'assertive')
      audioBus.emit({ earcon: 'blocked', force: true })
    },
    [announcer],
  )

  const run = useCallback(
    (command: Command, inputPath: InputPath = 'keyboard'): CommandResult => {
      const result = store.dispatch(command, { actorId: self.id, inputPath })
      if (!result.ok) {
        refuse(result.violation.message)
        return result
      }
      setLastError(null)
      announceEvents(result.events)
      applied(result.events)
      return result
    },
    [store, self.id, refuse, announceEvents],
  )

  /*
    A template is many commands but one gesture, so it is one undo step and one
    sentence. The individual events still go into the log -- rule 5 is about the
    record, and six things did happen -- but announcing six of them into a
    meeting is exactly the burst D7 exists to damp.
  */
  const insertTemplate = useCallback(
    (templateId: string, parentId: NodeId | null) => {
      const spec = templateById(templateId)
      if (!spec) return
      const built = spec.build()
      const result = store.dispatchBatch(expandTemplate(built, parentId), {
        actorId: self.id,
        inputPath: 'pointer',
      })
      if (!result.ok) {
        refuse(result.violation.message)
        return
      }
      announcer.announce(`Anda menambahkan templat ${spec.label}, ${templateSize(built)} simpul.`)
      audioBus.emit({ earcon: 'createNode', depth: 0, hue: hueOf(self.id) })
      applied(result.events)
    },
    [store, self.id, refuse, announcer, hueOf],
  )

  /*
    Undo is what makes the new rule 8 workable. Reversing a change is itself a
    change, so it gets the same treatment as any other: a sentence, an earcon,
    and a line in the log.
  */
  const undo = useCallback(() => {
    const event = store.undo(self.id)
    if (!event) {
      announcer.announce('Tidak ada perubahan yang bisa dibatalkan.', 'assertive')
      audioBus.emit({ earcon: 'blocked', force: true })
      return
    }
    announcer.announce(narrate(event, nameOf(event.actorId)), 'assertive')
    audioBus.emit({ earcon: 'undo', force: true })
  }, [store, self.id, announcer, nameOf])

  const api: DocumentApi = {
    store,
    self,
    doc,
    tree,
    suggestion,
    nameOf,
    hueOf,
    run,
    insertTemplate,
    undo,
    // Re-read on every render; the store notifies on both dispatch and undo.
    canUndo: store.canUndo(),
    subscribeApplied,
    votedByMe: (id) => hasVoted(doc, id, self.id),
    votesOn: (id) => countVotes(doc, id),
    lastError,
    reportError: setLastError,
    clearError: () => setLastError(null),
    simulateConflict: () => store.forceParent('n_riset', 'n_wawancara'),
  }

  return <DocumentContext.Provider value={api}>{children}</DocumentContext.Provider>
}

export function useDocument(): DocumentApi {
  const ctx = useContext(DocumentContext)
  if (!ctx) throw new Error('useDocument must be used inside RoomProvider')
  return ctx
}
