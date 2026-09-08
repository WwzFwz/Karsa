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
/** A tool card carries a list, so it needs more room than a title does. */
export const TOOL_W = 268
const GAP_X = 72
/*
  Tight enough that a twenty-node tree does not become a column taller than any
  screen. A tidy tree is naturally tall; every pixel of sibling gap is paid for
  again at the bottom of the diagram.
*/
const GAP_Y = 16

export interface NodeSize {
  w: number
  h: number
}

/**
 * How much room one node takes.
 *
 * Every layout asks this instead of assuming one card size, because a tool card
 * is wider than a title and grows with the number of options inside it. A
 * layout that assumes one size draws a tidy diagram right up until somebody
 * drops a vote into it and then quietly overlaps two cards, which reads as a
 * broken product rather than as a missing constant.
 *
 * Derived from the model on every render, never stored. Rule 2 is about the
 * document; measuring on the device is exactly what it leaves alone.
 */
export function sizeOf(
  tree: TreeProjection,
  id: NodeId,
  measured?: ReadonlyMap<NodeId, number>,
): NodeSize {
  const entry = tree.byId.get(id)
  const w = entry?.node.tool ? TOOL_W : NODE_W
  /*
    A measured height beats a guessed one, always.

    Guessing was the bug: a card is as tall as its title wraps plus whatever
    tags it carries, and NODE_H was only ever the height of the shortest
    possible one. Every long title quietly overlapped the sibling below it. The
    canvas measures what it drew and hands the numbers back, so the second frame
    is right and stays right -- and because nothing sets an explicit height, the
    measurement cannot chase itself.
  */
  const real = measured?.get(id)
  if (real && real > 0) return { w, h: real }
  if (!entry?.node.tool) return { w, h: NODE_H }
  // Fallback for the first frame only: head, a row per option, bottom padding.
  return { w, h: NODE_H + entry.childIds.length * 26 + 14 }
}

/**
 * A tidy tree: every subtree gets exactly the space it needs, so siblings never
 * overlap and adding a leaf shifts as little as possible.
 *
 * Several roots are laid out one after another along the same axis, so a tool
 * or a template that belongs to nobody has somewhere tidy to stand. Depth
 * offsets accumulate from the widest card at each level rather than from a
 * constant, which is what keeps a stand-alone voting card off its neighbour.
 */
function tidy(
  tree: TreeProjection,
  visible: ReadonlySet<NodeId>,
  vertical: boolean,
  measured?: ReadonlyMap<NodeId, number>,
): LayoutResult {
  const positions = new Map<NodeId, Point>()

  // Along the depth axis, each level is as deep as its widest card.
  const deepest: number[] = []
  for (const id of tree.preorder) {
    if (!visible.has(id)) continue
    const entry = tree.byId.get(id)
    if (!entry) continue
    const size = sizeOf(tree, id, measured)
    const extent = vertical ? size.h : size.w
    deepest[entry.depth] = Math.max(deepest[entry.depth] ?? 0, extent)
  }
  const downAt = (depth: number): number => {
    let total = 0
    for (let d = 0; d < depth; d += 1) {
      total += (deepest[d] ?? (vertical ? NODE_H : NODE_W)) + GAP_X
    }
    return total
  }

  let cursor = 0

  const place = (id: NodeId, depth: number): number => {
    const entry = tree.byId.get(id)
    const children = (entry?.childIds ?? []).filter((c) => visible.has(c))
    const size = sizeOf(tree, id, measured)
    const across = (vertical ? size.w : size.h) + GAP_Y
    let center: number
    if (children.length === 0) {
      center = cursor
      cursor += across
    } else {
      const centers = children.map((childId) => place(childId, depth + 1))
      center = (centers[0] + centers[centers.length - 1]) / 2
      // A parent taller than the span of its children still needs its own room.
      cursor = Math.max(cursor, center + across)
    }
    positions.set(id, vertical ? { x: center, y: downAt(depth) } : { x: downAt(depth), y: center })
    return center
  }

  for (const rootId of tree.rootIds) {
    if (!visible.has(rootId)) continue
    place(rootId, 0)
    // A clear break between one free-standing thing and the next.
    cursor += GAP_X
  }

  return measure(positions, tree, measured)
}

/**
 * Columns, one band per root.
 *
 * Every root used to be placed at the same point, so two of them drew on top of
 * each other. That was invisible while a room held exactly one tree and wrong
 * the moment a tool is allowed to stand on its own. Each root now owns a
 * horizontal band as tall as its own longest column, and the next starts below.
 */
function columns(
  tree: TreeProjection,
  visible: ReadonlySet<NodeId>,
  measured?: ReadonlyMap<NodeId, number>,
): LayoutResult {
  const positions = new Map<NodeId, Point>()
  let bandTop = 0

  for (const rootId of tree.rootIds) {
    if (!visible.has(rootId)) continue
    const rootSize = sizeOf(tree, rootId, measured)
    const heads = (tree.byId.get(rootId)?.childIds ?? []).filter((id) => visible.has(id))

    // Columns accumulate. Multiplying an index by one column's width put a wide
    // card straight through its neighbour the moment two columns differed.
    let x = 0
    let widest = 0
    // A root with no visible children -- a tool with its options folded into its
    // own card, say -- still occupies its own height, not a default row.
    let tallest = rootSize.h

    for (const headId of heads) {
      const headSize = sizeOf(tree, headId, measured)
      let y = bandTop + rootSize.h + GAP_Y
      positions.set(headId, { x, y })
      y += headSize.h + GAP_Y
      let columnWidth = headSize.w

      const stack = [...(tree.byId.get(headId)?.childIds ?? [])]
      while (stack.length) {
        const id = stack.shift()!
        if (!visible.has(id)) continue
        const size = sizeOf(tree, id, measured)
        const indent = ((tree.byId.get(id)?.depth ?? 2) - 2) * 18
        positions.set(id, { x: x + indent, y })
        y += size.h + GAP_Y
        columnWidth = Math.max(columnWidth, indent + size.w)
        stack.unshift(...(tree.byId.get(id)?.childIds ?? []))
      }

      tallest = Math.max(tallest, y - bandTop)
      x += columnWidth + GAP_X
      widest = Math.max(widest, x - GAP_X)
    }

    // The root sits above the columns it owns, centred over them.
    positions.set(rootId, {
      x: Math.max(0, (widest - rootSize.w) / 2),
      y: bandTop,
    })
    bandTop += tallest + GAP_X
  }

  return measure(positions, tree, measured)
}

function timeline(
  tree: TreeProjection,
  visible: ReadonlySet<NodeId>,
  measured?: ReadonlyMap<NodeId, number>,
): LayoutResult {
  const positions = new Map<NodeId, Point>()
  const ordered = tree.preorder
    .filter((id) => visible.has(id))
    .map((id) => tree.byId.get(id)!)
    .sort((a, b) => a.node.createdAt - b.node.createdAt || (a.node.id < b.node.id ? -1 : 1))

  // Cumulative, not indexed: a wide card has to push the next one along rather
  // than be drawn underneath it.
  let x = 0
  for (const entry of ordered) {
    positions.set(entry.node.id, { x, y: entry.depth * (NODE_H + GAP_Y) })
    x += sizeOf(tree, entry.node.id, measured).w + GAP_Y
  }

  return measure(positions, tree, measured)
}

function measure(
  positions: Map<NodeId, Point>,
  tree: TreeProjection,
  measured?: ReadonlyMap<NodeId, number>,
): LayoutResult {
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
  // The far edge belongs to whichever card actually reaches furthest, which is
  // not always an ordinary one.
  let right = 0
  let bottom = 0
  for (const [id, p] of positions) {
    const size = sizeOf(tree, id, measured)
    right = Math.max(right, p.x + size.w)
    bottom = Math.max(bottom, p.y + size.h)
  }
  for (const [id, p] of positions) positions.set(id, { x: p.x - minX, y: p.y - minY })
  return { positions, width: right - minX, height: bottom - minY }
}

export function layoutFor(
  shape: RoomShape,
  tree: TreeProjection,
  visible: ReadonlySet<NodeId>,
  /** Heights the canvas actually drew last frame, keyed by node id. */
  measured?: ReadonlyMap<NodeId, number>,
): LayoutResult {
  switch (shape) {
    case 'mindmap':
      return tidy(tree, visible, false, measured)
    case 'hierarchy':
    case 'flow':
      return tidy(tree, visible, true, measured)
    case 'columns':
      return columns(tree, visible, measured)
    case 'timeline':
      return timeline(tree, visible, measured)
  }
}
