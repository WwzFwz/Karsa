/**
 * Rule 5 demands that every operation produce an event that can be narrated in
 * one sentence. That event needs somewhere to live, so it lives here -- inside
 * the document, append-only.
 *
 * One structure serves four features, which is why it exists at P0 rather than
 * being invented four times later:
 *   - event sounds (P4), by mapping type to an earcon
 *   - screen reader narration (P0), via narrate()
 *   - review mode / walking back through the session (P4)
 *   - contribution summary (P5), by counting actorId and inputPath
 *
 * The payload carries every label the sentence needs, so narration never has to
 * look anything up. A node deleted an hour ago can still be described.
 */

import type { ActorId, EventId, InputPath, NodeKind, NodeState, RelationKind, RoomShape } from '../model/types'

export type EventType =
  | 'createNode'
  | 'renameNode'
  | 'setNodeKind'
  | 'setNodeState'
  | 'setNodeNote'
  | 'moveNode'
  | 'reorderNode'
  | 'deleteNode'
  | 'addRelation'
  | 'removeRelation'
  | 'relabelRelation'
  | 'addComment'
  | 'resolveComment'
  | 'setRoomTitle'
  | 'setRoomShape'
  | 'cycleResolved'
  | 'undo'

export interface EventPayload {
  title?: string
  previousTitle?: string
  parentTitle?: string
  previousParentTitle?: string
  fromTitle?: string
  toTitle?: string
  kind?: NodeKind
  previousKind?: NodeKind
  state?: NodeState
  relationKind?: RelationKind
  label?: string
  shape?: RoomShape
  previousShape?: RoomShape
  descendantCount?: number
  direction?: 'up' | 'down'
  position?: number
  targetTitle?: string
  nodeId?: string
  /** undo only: which event was reversed, so contribution counting can skip it. */
  undoneEventId?: EventId
  undoneType?: EventType
}

export interface DocEvent {
  id: EventId
  seq: number
  at: number
  actorId: ActorId
  inputPath: InputPath
  type: EventType
  payload: EventPayload
  /** 'system' covers repairs that nobody asked for, such as a cycle cut. */
  origin: 'user' | 'system'
}

/** Events that count towards someone's contribution share. */
export const CONTRIBUTING_EVENTS: EventType[] = [
  'createNode',
  'renameNode',
  'setNodeKind',
  'setNodeState',
  'setNodeNote',
  'moveNode',
  'reorderNode',
  'deleteNode',
  'addRelation',
  'removeRelation',
  'relabelRelation',
  'addComment',
  'resolveComment',
]
