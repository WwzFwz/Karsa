/**
 * In-memory implementation for the mock phase. No server, no sync, no Yjs.
 * Same interface as the real one will have.
 */

import { applyCommand } from '../core/commands/apply'
import { newEventId } from '../core/model/ids'
import type { DocEvent } from '../core/events/types'
import type { Command, CommandContext, CommandResult } from '../core/commands/types'
import type { ActorId, NodeId, Participant, RoomDoc } from '../core/model/types'
import type { DocStore, PresenceSnapshot } from './DocStore'

export class MemoryDocStore implements DocStore {
  private doc: RoomDoc
  private presence: PresenceSnapshot
  /**
   * Snapshots taken before each successful change on this device.
   *
   * Snapshot undo rather than inverse commands: the document is already cloned
   * on every write, so this is exact and cannot drift. At real P0 this becomes
   * a Yjs UndoManager scoped to this client's own origin, which is the same
   * promise -- you can only take back your own work, never someone else's.
   */
  private history: RoomDoc[] = []
  private static readonly HISTORY_LIMIT = 60
  private docListeners = new Set<() => void>()
  private presenceListeners = new Set<() => void>()

  constructor(doc: RoomDoc, selfId: ActorId, participants: Participant[]) {
    this.doc = doc
    this.presence = { selfId, participants }
  }

  getDoc = (): RoomDoc => this.doc

  subscribeDoc = (listener: () => void): (() => void) => {
    this.docListeners.add(listener)
    return () => this.docListeners.delete(listener)
  }

  dispatch = (command: Command, ctx: CommandContext): CommandResult => {
    const { doc, result } = applyCommand(this.doc, command, ctx)
    if (result.ok) {
      this.history.push(this.doc)
      if (this.history.length > MemoryDocStore.HISTORY_LIMIT) this.history.shift()
      this.doc = doc
      this.docListeners.forEach((l) => l())
    }
    return result
  }

  /**
   * Several commands, one undo step.
   *
   * A template drops six nodes at once. Six commands would mean six presses of
   * Ctrl+Z to take back one gesture, which is not "dapat dibatalkan" in any
   * sense a person would recognise -- so the snapshot is taken once, before the
   * first command, and the whole batch rewinds together. The events stay
   * separate, because rule 5 is about sentences and six things happened.
   *
   * All or nothing: if any command is refused, the document is left untouched.
   */
  dispatchBatch = (commands: Command[], ctx: CommandContext): CommandResult => {
    const before = this.doc
    let working = this.doc
    const events: DocEvent[] = []

    for (const command of commands) {
      const { doc, result } = applyCommand(working, command, ctx)
      if (!result.ok) return result
      working = doc
      events.push(...result.events)
    }

    this.history.push(before)
    if (this.history.length > MemoryDocStore.HISTORY_LIMIT) this.history.shift()
    this.doc = working
    this.docListeners.forEach((l) => l())
    return { ok: true, events }
  }

  canUndo = (): boolean => this.history.length > 0

  undo = (actorId: ActorId): DocEvent | null => {
    const previous = this.history.pop()
    if (!previous) return null

    const undone = this.doc.events[this.doc.events.length - 1]
    // A batch pushed one snapshot but several events; the gap between the two
    // event lists is exactly how much this press is taking back.
    const undoneCount = Math.max(1, this.doc.events.length - previous.events.length)
    const event: DocEvent = {
      id: newEventId(),
      seq: this.doc.events.length + 1,
      at: Date.now(),
      actorId,
      inputPath: 'keyboard',
      type: 'undo',
      origin: 'user',
      payload: {
        title: undone?.payload.title,
        targetTitle: undone?.payload.targetTitle,
        undoneEventId: undone?.id,
        undoneType: undone?.type,
        undoneCount,
      },
    }

    // Content rewinds; the log does not. An append-only log is what makes the
    // session reviewable afterwards, and hiding a reversal from it would be a
    // change nobody could hear about later.
    this.doc = {
      room: previous.room,
      nodes: previous.nodes,
      relations: previous.relations,
      comments: previous.comments,
      actors: previous.actors,
      events: [...this.doc.events, event],
    }
    this.docListeners.forEach((l) => l())
    return event
  }

  getPresence = (): PresenceSnapshot => this.presence

  subscribePresence = (listener: () => void): (() => void) => {
    this.presenceListeners.add(listener)
    return () => this.presenceListeners.delete(listener)
  }

  updateSelf = (patch: Partial<Omit<Participant, 'actorId'>>): void => {
    this.presence = {
      ...this.presence,
      participants: this.presence.participants.map((p) =>
        p.actorId === this.presence.selfId ? { ...p, ...patch, lastSeen: Date.now() } : p,
      ),
    }
    this.presenceListeners.forEach((l) => l())
  }

  pointAt = (nodeId: NodeId | null): void => {
    this.updateSelf({ pointingNodeId: nodeId })
  }

  /**
   * Mock only: lets the sample room feel inhabited without a server. Real
   * presence arrives through Awareness and this method disappears.
   */
  simulatePeer = (actorId: ActorId, patch: Partial<Omit<Participant, 'actorId'>>): void => {
    this.presence = {
      ...this.presence,
      participants: this.presence.participants.map((p) =>
        p.actorId === actorId ? { ...p, ...patch, lastSeen: Date.now() } : p,
      ),
    }
    this.presenceListeners.forEach((l) => l())
  }

  /** Mock only: replays a peer's edit so collaboration is visible in the demo. */
  dispatchAs = (command: Command, ctx: CommandContext): CommandResult => this.dispatch(command, ctx)

  /**
   * Mock only, and on purpose: writes a parent link straight past the rule
   * check, the way a merge from another device can. This is the one situation
   * Yjs cannot prevent, so the interface needs to be exercised against it
   * rather than against a description of it.
   */
  forceParent = (nodeId: NodeId, parentId: NodeId | null): void => {
    const node = this.doc.nodes[nodeId]
    if (!node) return
    this.doc = {
      ...this.doc,
      nodes: { ...this.doc.nodes, [nodeId]: { ...node, parentId } },
    }
    this.docListeners.forEach((l) => l())
  }
}
