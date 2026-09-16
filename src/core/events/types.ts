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

import type { ActorId, EventId, InputPath, NodeKind, NodeState, RelationKind, RoomShape, ToolKind } from '../model/types'

export type EventType =
  | 'createNode'
  | 'renameNode'
  | 'setNodeKind'
  | 'setNodeState'
  | 'setNodeNote'
  | 'setNodeTool'
  | 'voteNode'
  | 'unvoteNode'
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
  tool?: ToolKind
  previousTool?: ToolKind
  /** The tally after this vote, so the sentence never has to recount. */
  voteCount?: number
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
  /**
   * undo only: how many events one press took back. A batch -- a template, say
   * -- is one gesture and rewinds as one, so the sentence has to say four
   * rather than naming whichever of the four happened to be last.
   */
  undoneCount?: number
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
  'setNodeTool',
  // Voting counts. Choosing between the options somebody else wrote is
  // participating, and a summary that says otherwise is telling the room that
  // the quiet ones did nothing.
  'voteNode',
]
