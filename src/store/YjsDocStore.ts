/**
 * The room document as a Yjs document.
 *
 * `core/` stays the judge: every command is still applied by `applyCommand` to
 * a plain snapshot, and only the difference it produced is written into Yjs,
 * in one transaction. So the rules, the events and their sentences are the same
 * code whether the change came from this device or arrived from another one.
 *
 * Layout inside the Y.Doc:
 *   room       Y.Map    id, title, shape, createdAt
 *   nodes      Y.Map    id -> Y.Map of fields
 *   relations  Y.Map    id -> plain object
 *   comments   Y.Map    id -> plain object
 *   actors     Y.Map    id -> plain object
 *   events     Y.Array  plain objects, append-only
 *
 * A node is a map of fields, not one value, so renaming a node and moving it at
 * the same time on two devices keeps both. `parentId` is one of those fields: a
 * single last-writer-wins value, which at worst produces a cycle, and cycles
 * are repaired on read (D9, D10).
 */

import * as Y from 'yjs'
import { applyCommand } from '../core/commands/apply'
import { newEventId } from '../core/model/ids'
import type { DocEvent } from '../core/events/types'
import type { Command, CommandContext, CommandResult } from '../core/commands/types'
import type {
  Actor,
  ActorId,
  Comment,
  Node,
  NodeId,
  Relation,
  Room,
  RoomDoc,
} from '../core/model/types'
import type { DocStore } from './DocStore'
import { RoomPresence, type RoomPresenceOptions } from './presence'

/** Transactions made by this device's commands. The only ones undo may take back. */
const LOCAL = 'karsa:local'
/** Writes that are not anyone's change: seeding a room, registering a name. */
const SYSTEM = 'karsa:system'

const HISTORY_LIMIT = 60

/*
  How long ago an event may have happened and still be announced when it
  arrives. Opening a room pulls in its whole history, and reading an hour of
  somebody else's meeting aloud is noise, not situational awareness.
*/
const FRESH_MS = 15_000

type FlatKey = 'relations' | 'comments' | 'actors'

interface HistoryEntry {
  events: DocEvent[]
  /** False when the change touched only the log, e.g. a vote (D42). */
  tracked: boolean
}

export interface YjsDocStoreOptions {
  /** Written into the document the first time the room is opened anywhere. */
  initial: RoomDoc
  self: Actor
  presence?: RoomPresenceOptions
  ydoc?: Y.Doc
  now?: () => number
}

export class YjsDocStore implements DocStore {
  readonly ydoc: Y.Doc
  private readonly room: Y.Map<unknown>
  private readonly nodes: Y.Map<Y.Map<unknown>>
  private readonly flat: Record<FlatKey, Y.Map<unknown>>
  private readonly events: Y.Array<DocEvent>

  private readonly initial: RoomDoc
  private readonly self: Actor
  private readonly now: () => number
  private readonly openedAt: number

  private snapshot: RoomDoc
  /** Who is here. Separate from the document on purpose: never logged, never undone. */
  readonly presence: RoomPresence
  private readonly undoManager: Y.UndoManager
  private history: HistoryEntry[] = []
  private recording = false
  private recorded = false

  private dirty = {
    room: false,
    nodes: new Set<NodeId>(),
    relations: new Set<string>(),
    comments: new Set<string>(),
    actors: new Set<string>(),
    events: false,
  }

  private docListeners = new Set<() => void>()
  private remoteListeners = new Set<(events: DocEvent[]) => void>()

  constructor(options: YjsDocStoreOptions) {
    this.ydoc = options.ydoc ?? new Y.Doc()
    this.room = this.ydoc.getMap('room')
    this.nodes = this.ydoc.getMap('nodes')
    this.flat = {
      relations: this.ydoc.getMap('relations'),
      comments: this.ydoc.getMap('comments'),
      actors: this.ydoc.getMap('actors'),
    }
    this.events = this.ydoc.getArray('events')
    this.initial = options.initial
    this.self = options.self
    this.now = options.now ?? Date.now
    this.openedAt = this.now()
    this.presence = new RoomPresence(options.self, options.presence)

    // Until the room exists in Yjs, the interface shows what it will be seeded with.
    this.snapshot = this.isSeeded() ? this.read() : options.initial

    this.room.observe(() => {
      this.dirty.room = true
    })
    this.nodes.observeDeep((changes) => {
      for (const change of changes) {
        if (change.target !== this.nodes) this.dirty.nodes.add(change.path[0] as NodeId)
        else (change as Y.YMapEvent<unknown>).keysChanged.forEach((id) => this.dirty.nodes.add(id))
      }
    })
    for (const key of ['relations', 'comments', 'actors'] as const) {
      this.flat[key].observe((change) => change.keysChanged.forEach((id) => this.dirty[key].add(id)))
    }
    this.events.observe(() => {
      this.dirty.events = true
    })
    this.ydoc.on('afterTransaction', this.onTransaction)

    /*
      Undo takes back this device's own changes and nothing else: another
      person's edit that landed afterwards stays. The log is outside its scope
      on purpose -- a reversal is itself an event, and the log only grows (D21).
    */
    this.undoManager = new Y.UndoManager([this.room, this.nodes, ...Object.values(this.flat)], {
      trackedOrigins: new Set([LOCAL]),
      captureTimeout: 0,
    })
    this.undoManager.on('stack-item-added', (event: { type: 'undo' | 'redo' }) => {
      if (this.recording && event.type === 'undo') this.recorded = true
    })
  }

  // --- reading -------------------------------------------------------------

  getDoc = (): RoomDoc => this.snapshot

  subscribeDoc = (listener: () => void): (() => void) => {
    this.docListeners.add(listener)
    return () => this.docListeners.delete(listener)
  }

  /** Changes that came from another device, recent enough to announce. */
  subscribeRemoteEvents = (listener: (events: DocEvent[]) => void): (() => void) => {
    this.remoteListeners.add(listener)
    return () => this.remoteListeners.delete(listener)
  }

  private isSeeded(): boolean {
    return this.room.size > 0
  }

  private onTransaction = (transaction: Y.Transaction) => {
    const d = this.dirty
    const changed =
      d.room || d.events || d.nodes.size || d.relations.size || d.comments.size || d.actors.size
    if (!changed || !this.isSeeded()) return

    const before = this.snapshot
    this.snapshot = this.read(before)

    if (!transaction.local && this.snapshot.events !== before.events) {
      const known = new Set(before.events.map((e) => e.id))
      const arrived = this.snapshot.events.filter(
        (e) => !known.has(e.id) && e.at >= this.openedAt - FRESH_MS,
      )
      if (arrived.length > 0) this.remoteListeners.forEach((l) => l(arrived))
    }
    this.docListeners.forEach((l) => l())
  }

  /**
   * Builds the plain snapshot the views read. Only what changed is rebuilt, so
   * an untouched node keeps its identity and React skips it.
   */
  private read(previous?: RoomDoc): RoomDoc {
    const d = this.dirty
    const full = previous === undefined || previous === this.initial

    const room = full || d.room ? (this.room.toJSON() as Room) : previous.room

    let nodes = full ? {} : previous.nodes
    const nodeIds = full ? Array.from(this.nodes.keys()) : Array.from(d.nodes)
    if (nodeIds.length > 0) {
      nodes = { ...nodes }
      for (const id of nodeIds) {
        const map = this.nodes.get(id)
        if (map) nodes[id] = map.toJSON() as Node
        else delete nodes[id]
      }
    }

    const flat = <T,>(key: FlatKey): Record<string, T> => {
      let out: Record<string, T> = full ? {} : (previous[key] as Record<string, T>)
      const ids = full ? Array.from(this.flat[key].keys()) : Array.from(d[key])
      if (ids.length === 0) return out
      out = { ...out }
      for (const id of ids) {
        const value = this.flat[key].get(id) as T | undefined
        if (value) out[id] = value
        else delete out[id]
      }
      return out
    }

    const snapshot: RoomDoc = {
      room,
      nodes,
      relations: flat<Relation>('relations'),
      comments: flat<Comment>('comments'),
      actors: flat<Actor>('actors'),
      events: full || d.events ? this.events.toArray() : previous.events,
    }

    this.dirty = {
      room: false,
      nodes: new Set(),
      relations: new Set(),
      comments: new Set(),
      actors: new Set(),
      events: false,
    }
    return snapshot
  }

  // --- loading -------------------------------------------------------------

  /**
   * Called once local storage (and later the server) has delivered what it
   * has. A room nobody has written to yet is seeded here, and this device's
   * name is put in the document so other people's narration can say it.
   *
   * Seeding uses fixed ids, so two devices seeding at the same moment write the
   * same keys and converge. The server seeds rooms itself once it exists.
   */
  markLoaded = (): void => {
    this.ensureSeeded()
    const known = this.snapshot.actors[this.self.id]
    if (!known || known.displayName !== this.self.displayName || known.hue !== this.self.hue) {
      this.ydoc.transact(() => this.flat.actors.set(this.self.id, { ...this.self }), SYSTEM)
    }
  }

  private ensureSeeded(): void {
    if (this.isSeeded()) return
    const seed = this.initial
    this.ydoc.transact(() => {
      for (const [key, value] of Object.entries(seed.room)) this.room.set(key, value)
      for (const node of Object.values(seed.nodes)) this.writeNode(node)
      for (const key of ['relations', 'comments', 'actors'] as const) {
        for (const [id, value] of Object.entries(seed[key])) this.flat[key].set(id, clean(value))
      }
      this.events.push(seed.events.map(clean))
    }, SYSTEM)
  }

  // --- writing -------------------------------------------------------------

  dispatch = (command: Command, ctx: CommandContext): CommandResult => {
    this.ensureSeeded()
    const { doc, result } = applyCommand(this.snapshot, command, ctx)
    if (result.ok) this.commit(this.snapshot, doc, result.events)
    return result
  }

  /**
   * Several commands, one undo step (D44). All or nothing: if any command is
   * refused, nothing is written.
   */
  dispatchBatch = (commands: Command[], ctx: CommandContext): CommandResult => {
    this.ensureSeeded()
    const before = this.snapshot
    let working = before
    const events: DocEvent[] = []
    for (const command of commands) {
      const { doc, result } = applyCommand(working, command, ctx)
      if (!result.ok) return result
      working = doc
      events.push(...result.events)
    }
    this.commit(before, working, events)
    return { ok: true, events }
  }

  private commit(before: RoomDoc, after: RoomDoc, events: DocEvent[]): void {
    this.recording = true
    this.recorded = false
    try {
      this.ydoc.transact(() => this.writeDiff(before, after), LOCAL)
    } finally {
      this.recording = false
    }
    this.history.push({ events, tracked: this.recorded })
    if (this.history.length > HISTORY_LIMIT) {
      const dropped = this.history.shift()
      if (dropped?.tracked) this.undoManager.undoStack.shift()
    }
  }

  /** Writes only what differs. `before` is the snapshot, which mirrors Yjs. */
  private writeDiff(before: RoomDoc, after: RoomDoc): void {
    if (after.room !== before.room) {
      for (const [key, value] of Object.entries(after.room)) {
        if (this.room.get(key) !== value) this.room.set(key, value)
      }
    }

    for (const [id, node] of Object.entries(after.nodes)) {
      if (before.nodes[id] !== node) this.writeNode(node)
    }
    for (const id of Object.keys(before.nodes)) {
      if (!(id in after.nodes)) this.nodes.delete(id)
    }

    for (const key of ['relations', 'comments', 'actors'] as const) {
      const was = before[key] as Record<string, unknown>
      const now = after[key] as Record<string, unknown>
      for (const [id, value] of Object.entries(now)) {
        if (was[id] !== value) this.flat[key].set(id, clean(value))
      }
      for (const id of Object.keys(was)) {
        if (!(id in now)) this.flat[key].delete(id)
      }
    }

    const added = after.events.slice(before.events.length)
    if (added.length > 0) this.events.push(added.map(clean))
  }

  /** Field by field, so concurrent edits to different fields both survive. */
  private writeNode(node: Node): void {
    let map = this.nodes.get(node.id)
    if (!map) {
      map = new Y.Map()
      this.nodes.set(node.id, map)
    }
    const fields = node as unknown as Record<string, unknown>
    for (const key of Array.from(map.keys())) {
      if (fields[key] === undefined) map.delete(key)
    }
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && map.get(key) !== value) map.set(key, value)
    }
  }

  // --- undo ----------------------------------------------------------------

  canUndo = (): boolean => this.history.length > 0

  undo = (actorId: ActorId): DocEvent | null => {
    const entry = this.history.pop()
    if (!entry) return null
    if (entry.tracked) this.undoManager.undo()

    const undone = entry.events[entry.events.length - 1]
    const event: DocEvent = {
      id: newEventId(),
      seq: this.snapshot.events.length + 1,
      at: this.now(),
      actorId,
      inputPath: 'keyboard',
      type: 'undo',
      origin: 'user',
      payload: {
        title: undone?.payload.title,
        targetTitle: undone?.payload.targetTitle,
        undoneEventId: undone?.id,
        undoneType: undone?.type,
        undoneCount: Math.max(1, entry.events.length),
      },
    }
    // Content rewinds; the log does not (D21).
    this.ydoc.transact(() => this.events.push([clean(event)]), SYSTEM)
    return event
  }

  /**
   * Writes a parent link straight past the rules, the way a crossing merge from
   * another device can. Used to show and hear the repair path on demand.
   */
  forceParent = (nodeId: NodeId, parentId: NodeId | null): void => {
    const map = this.nodes.get(nodeId)
    if (!map) return
    this.ydoc.transact(() => map.set('parentId', parentId), SYSTEM)
  }
}

/** Yjs stores JSON-like values; an `undefined` field is dropped, not stored. */
function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
