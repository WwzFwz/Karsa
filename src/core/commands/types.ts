/**
 * The single door into the data.
 *
 * Keyboard and pointer input become commands directly. Voice input parks in a
 * local draft and only becomes a command once the person presses Terapkan
 * (rule 8). Both meet here. There is no other path from the interface to the
 * document, and no view derives its contents from another view.
 */

import type {
  ActorId,
  CommentId,
  InputPath,
  NodeId,
  NodeKind,
  NodeState,
  RelationId,
  RelationKind,
  RoomShape,
  ToolKind,
} from '../model/types'
import type { DocEvent } from '../events/types'
import type { RuleViolation } from '../rules/invariants'

export type Command =
  | { type: 'createNode'; parentId: NodeId | null; kind: NodeKind; title: string; afterId?: NodeId | null; note?: string }
  | { type: 'renameNode'; id: NodeId; title: string }
  | { type: 'setNodeKind'; id: NodeId; kind: NodeKind }
  | { type: 'setNodeState'; id: NodeId; state: NodeState }
  | { type: 'setNodeTool'; id: NodeId; tool: ToolKind | null }
  /** Toggles: voting twice takes the vote back, and both halves are events. */
  | { type: 'voteNode'; id: NodeId }
  | { type: 'setNodeNote'; id: NodeId; note: string }
  | { type: 'moveNode'; id: NodeId; parentId: NodeId | null; afterId?: NodeId | null }
  | { type: 'reorderNode'; id: NodeId; direction: 'up' | 'down' }
  | { type: 'deleteNode'; id: NodeId; mode: 'promote' | 'cascade' }
  | { type: 'addRelation'; fromId: NodeId; toId: NodeId; kind: RelationKind; label?: string }
  | { type: 'removeRelation'; id: RelationId }
  | { type: 'relabelRelation'; id: RelationId; label: string }
  | { type: 'addComment'; targetType: 'node' | 'relation'; targetId: string; body: string; replyToId?: CommentId }
  | { type: 'resolveComment'; id: CommentId }
  | { type: 'setRoomTitle'; title: string }
  | { type: 'setRoomShape'; shape: RoomShape }

export type CommandType = Command['type']

export interface CommandContext {
  actorId: ActorId
  inputPath: InputPath
}

export type CommandResult =
  | { ok: true; events: DocEvent[] }
  | { ok: false; violation: RuleViolation }

/**
 * Navigation, listed here on purpose so the boundary stays visible.
 *
 * The dividing line: if an action changes what someone else's screen reader
 * would read out, it changes data. If it does not, it is navigation.
 * Collapsing folds my screen, not yours, so it lives here.
 */
export const NAVIGATION_ACTIONS = [
  'focusNode',
  'moveFocusParent',
  'moveFocusFirstChild',
  'moveFocusNextSibling',
  'moveFocusPrevSibling',
  'expandNode',
  'collapseNode',
  'pointAt',
  'clearPointing',
  'switchView',
  'zoomPan',
  'filterByKind',
  'search',
  'startAudioTraversal',
  'stopAudioTraversal',
  'setSoundProfile',
  'setMode',
  'openPanel',
  'closePanel',
] as const

export type NavigationAction = (typeof NAVIGATION_ACTIONS)[number]
