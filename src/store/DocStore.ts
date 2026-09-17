/**
 * The one interface the interface knows about.
 *
 * Backed by `YjsDocStore`. Presence is kept on its own channel because it is
 * ephemeral and noisy -- exactly the split Yjs makes between the document and
 * Awareness.
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

  /**
   * Events that arrived from another device while the room was open. Changes
   * made here are announced by whoever dispatched them; these are the ones
   * nobody on this device caused, and following them is the core claim.
   */
  subscribeRemoteEvents(listener: (events: DocEvent[]) => void): () => void

  /** The only way to change the document. */
  dispatch(command: Command, ctx: CommandContext): CommandResult

  /** Several commands as one gesture and one undo step (D44). */
  dispatchBatch(commands: Command[], ctx: CommandContext): CommandResult

  /**
   * Reverse the last change made on this device, and only that: a change by
   * someone else that landed afterwards stays. Returns the event describing
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
