/**
 * Read-time projection of the flat node map into the canonical tree.
 *
 * Yjs has no safe tree move. Two people moving nodes across each other can
 * merge into a loop, which would destroy both the outline and the audio
 * traversal -- rule 1. The repair therefore happens here, on the read path, as
 * a pure function:
 *
 *   1. Follow parentId from every node.
 *   2. On a loop, cut the edge above the smallest id in that loop.
 *   3. Report the cut so it can be sounded and announced.
 *
 * Because the rule is identical on every device and no write occurs, a looped
 * document never *looks* broken anywhere, even before anyone repairs it.
 * Writing the repair back is optional hygiene, not safety.
 */

import { compareSiblings } from '../model/order'
import type { Node, NodeId, RoomDoc } from '../model/types'

export interface CycleRepair {
  /** The node whose parent link was cut. */
  nodeId: NodeId
  /** Where it pointed before the cut. */
  formerParentId: NodeId
  /** Every node that took part in the loop, smallest id first. */
  members: NodeId[]
  reason: 'cycle' | 'missing_parent'
}

export interface ProjectedNode {
  node: Node
  depth: number
  childIds: NodeId[]
  /** Effective parent after repair, which may differ from node.parentId. */
  parentId: NodeId | null
  /** 1-based position among siblings, for aria-posinset. */
  posInSet: number
  setSize: number
}

export interface TreeProjection {
  byId: Map<NodeId, ProjectedNode>
  rootIds: NodeId[]
  /** Depth-first order. The one true reading order for outline and audio. */
  preorder: NodeId[]
  repairs: CycleRepair[]
}

/**
 * Each node has at most one parent, so the parent graph is a functional graph:
 * every connected component holds at most one cycle. One pass is enough.
 */
function findCuts(nodes: Record<NodeId, Node>): Map<NodeId, CycleRepair> {
  const cuts = new Map<NodeId, CycleRepair>()
  const settled = new Set<NodeId>()

  for (const startId of Object.keys(nodes)) {
    if (settled.has(startId)) continue

    const path: NodeId[] = []
    const onPath = new Map<NodeId, number>()
    let cursor: NodeId | null = startId

    while (cursor !== null && !settled.has(cursor)) {
      const seenAt = onPath.get(cursor)
      if (seenAt !== undefined) {
        const members = path.slice(seenAt).sort()
        const victim = members[0]
        const formerParentId = nodes[victim].parentId
        if (formerParentId !== null) {
          cuts.set(victim, { nodeId: victim, formerParentId, members, reason: 'cycle' })
        }
        break
      }
      onPath.set(cursor, path.length)
      path.push(cursor)

      const current: Node = nodes[cursor]
      const nextId: NodeId | null = current.parentId
      if (nextId !== null && !nodes[nextId]) {
        // Parent was deleted or never arrived. Same treatment, different reason.
        cuts.set(cursor, {
          nodeId: cursor,
          formerParentId: nextId,
          members: [cursor],
          reason: 'missing_parent',
        })
        break
      }
      cursor = nextId
    }

    for (const id of path) settled.add(id)
  }

  return cuts
}

export function projectTree(doc: RoomDoc): TreeProjection {
  const nodes = doc.nodes
  const cuts = findCuts(nodes)

  const childrenOf = new Map<NodeId | null, Node[]>()
  for (const id of Object.keys(nodes)) {
    const node = nodes[id]
    const effectiveParent = cuts.has(id) ? null : node.parentId
    const bucket = childrenOf.get(effectiveParent)
    if (bucket) bucket.push(node)
    else childrenOf.set(effectiveParent, [node])
  }
  for (const bucket of childrenOf.values()) bucket.sort(compareSiblings)

  const byId = new Map<NodeId, ProjectedNode>()
  const preorder: NodeId[] = []

  const walk = (parentId: NodeId | null, depth: number): NodeId[] => {
    const siblings = childrenOf.get(parentId) ?? []
    const ids: NodeId[] = []
    siblings.forEach((node, index) => {
      preorder.push(node.id)
      const entry: ProjectedNode = {
        node,
        depth,
        parentId,
        childIds: [],
        posInSet: index + 1,
        setSize: siblings.length,
      }
      byId.set(node.id, entry)
      entry.childIds = walk(node.id, depth + 1)
      ids.push(node.id)
    })
    return ids
  }

  const rootIds = walk(null, 0)

  return { byId, rootIds, preorder, repairs: [...cuts.values()] }
}

/** Every descendant of `id`, deepest last. Used by delete and by narration. */
export function descendantsOf(tree: TreeProjection, id: NodeId): NodeId[] {
  const out: NodeId[] = []
  const stack = [...(tree.byId.get(id)?.childIds ?? [])]
  while (stack.length) {
    const next = stack.shift()!
    out.push(next)
    stack.unshift(...(tree.byId.get(next)?.childIds ?? []))
  }
  return out
}

export function pathTo(tree: TreeProjection, id: NodeId): NodeId[] {
  const out: NodeId[] = []
  let cursor: NodeId | null = id
  while (cursor !== null) {
    out.unshift(cursor)
    cursor = tree.byId.get(cursor)?.parentId ?? null
  }
  return out
}

/**
 * The visible reading order, honouring per-person collapse state. Collapsing is
 * navigation, not data: it folds my screen, never yours.
 */
export function visibleOrder(tree: TreeProjection, collapsed: ReadonlySet<NodeId>): NodeId[] {
  const out: NodeId[] = []
  const walk = (ids: NodeId[]) => {
    for (const id of ids) {
      out.push(id)
      const entry = tree.byId.get(id)
      if (entry && entry.childIds.length > 0 && !collapsed.has(id)) walk(entry.childIds)
    }
  }
  walk(tree.rootIds)
  return out
}
