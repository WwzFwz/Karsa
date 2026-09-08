/**
 * Layout: tree -> coordinates. Local only. Coordinates are computed on each
 * device and never enter the document (rule 2), which is exactly why switching
 * shape is safe and why nothing here needs to be synced.
 *
 * All five shapes are the same model under a different algorithm, not different
 * data. Adding a shape must never add a field to Node.
 *
 * D5: positions may differ between devices. That is allowed, because no meaning
 * is stored in them. What is not allowed is the canvas jumping under one
 * person, so the caller keeps previous positions and eases towards new ones.
 */

import type { NodeId, RoomShape } from '../model/types'
import type { TreeProjection } from '../tree/project'

export interface Point {
  x: number
  y: number
}

export interface LayoutResult {
  positions: Map<NodeId, Point>
  width: number
  height: number
}

export const NODE_W = 188
export const NODE_H = 62
const GAP_X = 72
/*
  Tight enough that a twenty-node tree does not become a column taller than any
  screen. A tidy tree is naturally tall; every pixel of sibling gap is paid for
  again at the bottom of the diagram.
*/
const GAP_Y = 16

/**
 * A tidy tree: every subtree gets exactly the space it needs, so siblings never
 * overlap and adding a leaf shifts as little as possible.
 */
function tidy(
  tree: TreeProjection,
  visible: ReadonlySet<NodeId>,
  vertical: boolean,
): LayoutResult {
  const positions = new Map<NodeId, Point>()
  const across = vertical ? NODE_W + GAP_Y : NODE_H + GAP_Y
  const down = vertical ? NODE_H + GAP_X : NODE_W + GAP_X
  let cursor = 0

  const place = (id: NodeId, depth: number): number => {
    const entry = tree.byId.get(id)
    const children = (entry?.childIds ?? []).filter((c) => visible.has(c))
    let center: number
    if (children.length === 0) {
      center = cursor
      cursor += across
    } else {
      const centers = children.map((childId) => place(childId, depth + 1))
      center = (centers[0] + centers[centers.length - 1]) / 2
    }
    positions.set(id, vertical ? { x: center, y: depth * down } : { x: depth * down, y: center })
    return center
  }

  for (const rootId of tree.rootIds) {
    if (!visible.has(rootId)) continue
    place(rootId, 0)
    cursor += across * 0.6
  }

  return measure(positions)
}

function columns(tree: TreeProjection, visible: ReadonlySet<NodeId>): LayoutResult {
  const positions = new Map<NodeId, Point>()
  const colWidth = NODE_W + GAP_X
  const rowHeight = NODE_H + GAP_Y
  let column = 0

  const topLevel = tree.rootIds.flatMap((id) => [id, ...(tree.byId.get(id)?.childIds ?? [])])
  const heads = topLevel.filter((id) => visible.has(id) && tree.byId.get(id)?.depth === 1)

  for (const rootId of tree.rootIds) {
    if (visible.has(rootId)) positions.set(rootId, { x: 0, y: 0 })
  }

  for (const headId of heads) {
    let row = 1
    positions.set(headId, { x: column * colWidth, y: rowHeight })
    const stack = [...(tree.byId.get(headId)?.childIds ?? [])]
    while (stack.length) {
      const id = stack.shift()!
      if (!visible.has(id)) continue
      row += 1
      const depth = (tree.byId.get(id)?.depth ?? 2) - 2
      positions.set(id, { x: column * colWidth + depth * 18, y: row * rowHeight })
      stack.unshift(...(tree.byId.get(id)?.childIds ?? []))
    }
    column += 1
  }

  // Centre the roots over the columns they own.
  for (const rootId of tree.rootIds) {
    if (positions.has(rootId)) {
      positions.set(rootId, { x: Math.max(0, ((column - 1) * colWidth) / 2), y: 0 })
    }
  }

  return measure(positions)
}

function timeline(tree: TreeProjection, visible: ReadonlySet<NodeId>): LayoutResult {
  const positions = new Map<NodeId, Point>()
  const ordered = tree.preorder
    .filter((id) => visible.has(id))
    .map((id) => tree.byId.get(id)!)
    .sort((a, b) => a.node.createdAt - b.node.createdAt || (a.node.id < b.node.id ? -1 : 1))

  ordered.forEach((entry, index) => {
    positions.set(entry.node.id, {
      x: index * (NODE_W + GAP_Y),
      y: entry.depth * (NODE_H + GAP_Y),
    })
  })

  return measure(positions)
}

function measure(positions: Map<NodeId, Point>): LayoutResult {
  let maxX = 0
  let maxY = 0
  let minX = Infinity
  let minY = Infinity
  for (const p of positions.values()) {
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
  }
  if (positions.size === 0) return { positions, width: NODE_W, height: NODE_H }
  for (const [id, p] of positions) positions.set(id, { x: p.x - minX, y: p.y - minY })
  return { positions, width: maxX - minX + NODE_W, height: maxY - minY + NODE_H }
}

export function layoutFor(
  shape: RoomShape,
  tree: TreeProjection,
  visible: ReadonlySet<NodeId>,
): LayoutResult {
  switch (shape) {
    case 'mindmap':
      return tidy(tree, visible, false)
    case 'hierarchy':
    case 'flow':
      return tidy(tree, visible, true)
    case 'columns':
      return columns(tree, visible)
    case 'timeline':
      return timeline(tree, visible)
  }
}
