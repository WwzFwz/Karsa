/**
 * The one interface the interface knows about.
 *
 * Today this is backed by an in-memory store with sample data. At real P0 a
 * YjsDocStore implements the same shape and not a single component changes.
 * Presence is kept on its own channel because it is ephemeral and noisy --
 * exactly the split Yjs makes between the document and Awareness.
 */

import type { Command, CommandContext, CommandResult } from '../core/commands/types'
import type { ActorId, NodeId, Participant, RoomDoc } from '../core/model/types'
import type { DocEvent } from '../core/events/types'

export interface PresenceSnapshot {
  selfId: ActorId
  participants: Participant[]
}

export interface DocStore {
  getDoc(): RoomDoc
  subscribeDoc(listener: () => void): () => void

  /** The only way to change the document. */
  dispatch(command: Command, ctx: CommandContext): CommandResult

  /**
   * Reverse the last change by this device.
   *
   * Undo is what lets a voice command apply straight away instead of waiting
   * behind a confirmation for every single word. Returns the event describing
   * what was reversed, or null when there is nothing left to reverse.
   */
  undo(actorId: ActorId): DocEvent | null
  canUndo(): boolean

  getPresence(): PresenceSnapshot
  subscribePresence(listener: () => void): () => void
  updateSelf(patch: Partial<Omit<Participant, 'actorId'>>): void

  /** Ephemeral, symbolic, never a coordinate. */
  pointAt(nodeId: NodeId | null): void
}
