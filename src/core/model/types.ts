/**
 * The single shared model. Every one of the three views reads this and nothing
 * else. See docs/data-model.md.
 *
 * Hard constraint (rule 2): no field in this file may describe screen position,
 * size or colour. Coordinates are a local rendering concern and never travel.
 */

export type NodeId = string
export type RelationId = string
export type CommentId = string
export type EventId = string
export type ActorId = string
export type DraftId = string
export type RoomId = string

/** Rule 3: every meaningful piece of content carries a type. */
export type NodeKind =
  | 'root'
  | 'idea'
  | 'step'
  | 'decision'
  | 'question'
  | 'fact'
  | 'action'
  | 'group'

export type NodeState = 'open' | 'doing' | 'done' | 'blocked'

/** Which door the change came through. Needed from day one for attribution. */
export type InputPath = 'keyboard' | 'voice' | 'pointer' | 'system'

/**
 * Rule 1: extra relations never move a node inside the tree. These may cross
 * branches and may even form cycles -- harmless, because they are not the tree.
 */
export type RelationKind =
  | 'depends_on'
  | 'causes'
  | 'contradicts'
  | 'refers_to'
  | 'duplicates'
  | 'sequence'

/** Layout algorithms over the same model, not different data types. */
export type RoomShape = 'mindmap' | 'hierarchy' | 'flow' | 'timeline' | 'columns'

/**
 * A tool is the same idea as a shape, one level down: a layout and an
 * interaction skin over a sub-tree that already exists. It is never a new kind
 * of object and never a floating window, because a window has no place in the
 * outline and no place in audio traversal -- and a thing persona B cannot reach
 * is not a feature of this product.
 *
 * So a vote's options are child nodes, a checklist's items are child nodes, and
 * the tool field only says how to draw and operate them. See docs/tools.md.
 */
export type ToolKind = 'suara' | 'retro' | 'matriks'

export interface Node {
  id: NodeId
  /** null means "attached to the room root". Single LWW field -- see D9. */
  parentId: NodeId | null
  /** Fractional index among siblings. Inserting never touches other nodes. */
  order: string
  kind: NodeKind
  /** Rule 4: at most TITLE_MAX characters, sayable in one breath. */
  title: string
  /** Long form. Never drawn on the canvas; read in the outline. */
  note?: string
  /** Only meaningful for kind 'action' and 'decision'. */
  state?: NodeState
  /**
   * Turns this node into a tool whose children are its contents. Absent for
   * ordinary nodes, which is almost all of them.
   */
  tool?: ToolKind
  createdBy: ActorId
  createdAt: number
  updatedBy: ActorId
  updatedAt: number
  inputPath: InputPath
}

export interface Relation {
  id: RelationId
  fromId: NodeId
  toId: NodeId
  kind: RelationKind
  label?: string
  createdBy: ActorId
  createdAt: number
  inputPath: InputPath
}

export interface Comment {
  id: CommentId
  targetType: 'node' | 'relation'
  targetId: string
  /** One level of replies only. */
  replyToId?: CommentId
  body: string
  authorId: ActorId
  createdAt: number
  resolvedAt?: number
  resolvedBy?: ActorId
}

export interface Room {
  id: RoomId
  title: string
  shape: RoomShape
  createdAt: number
}

/** Participants live in Awareness, never in the document. */
export interface Participant {
  actorId: ActorId
  displayName: string
  /** 0-360, used for the canvas ring and, in audio, for timbre selection. */
  hue: number
  /** Rule: derived from the push-to-talk switch, not from an always-on mic (D4). */
  talking: boolean
  /** The person's logical cursor. */
  focusNodeId: NodeId | null
  /** "this one" as a symbolic reference, never as an x/y coordinate. */
  pointingNodeId: NodeId | null
  mode: 'meeting' | 'review'
  online: boolean
  lastSeen: number
}

export interface Actor {
  id: ActorId
  displayName: string
  hue: number
}

/** The whole synced document for one room. */
export interface RoomDoc {
  room: Room
  nodes: Record<NodeId, Node>
  relations: Record<RelationId, Relation>
  comments: Record<CommentId, Comment>
  /** Append-only. See core/events. */
  events: import('../events/types').DocEvent[]
  actors: Record<ActorId, Actor>
}
