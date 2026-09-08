/**
 * A small picture of what a room holds.
 *
 * Mermaid's dashboard shows a rendered diagram on every card, and it is the
 * reason their list is scannable: you recognise the shape of a board long
 * before you read its name. Ours draws the same idea from the room's shape and
 * size, deterministically from its code, so the same room always looks the same.
 *
 * It carries no text and is marked aria-hidden. The card's real name and its
 * counts are next to it in words, so nothing here is the only way to know what
 * this room is.
 */

import { KIND_HUE } from '../../ui/labels'
import type { NodeKind, RoomShape } from '../../core/model/types'

const KINDS: NodeKind[] = ['idea', 'step', 'decision', 'question', 'fact', 'action']

/** Small deterministic hash, so a room's thumbnail never changes between loads. */
function seedFrom(id: string): () => number {
  let state = 0
  for (let i = 0; i < id.length; i += 1) state = (state * 31 + id.charCodeAt(i)) >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0xffffffff
  }
}

export function RoomThumbnail({
  id,
  shape,
  nodeCount,
}: {
  id: string
  shape: RoomShape
  nodeCount: number
}) {
  const random = seedFrom(id)
  const W = 260
  const H = 132
  const rows = Math.max(2, Math.min(6, Math.round(nodeCount / 5)))
  const perRow = Math.max(2, Math.min(4, Math.ceil(nodeCount / rows / 1.4)))

  const vertical = shape === 'flow' || shape === 'hierarchy'
  // Step first, box second: a fixed box width wider than the column spacing
  // made the levels overlap each other into a smear.
  const step = (vertical ? H - 30 : W - 66) / Math.max(1, rows - 1)
  const boxW = vertical ? 46 : Math.max(22, Math.round(step - 12))
  const boxH = 13

  /*
    Built row by row, each box hanging off one in the row before it. Drawing
    edges between arbitrary pairs produced a cat's cradle that looked like
    noise; a thumbnail has to read as a diagram at a glance or it is decoration.
  */
  type Cell = { x: number; y: number; kind: NodeKind; parent: number | null }
  const cells: Cell[] = []
  const rowStart: number[] = []

  for (let row = 0; row < rows; row += 1) {
    rowStart.push(cells.length)
    const previous = row === 0 ? [] : cells.slice(rowStart[row - 1], rowStart[row])
    const count = row === 0 ? 1 : Math.max(1, Math.round(perRow * (0.6 + random() * 0.7)))
    for (let col = 0; col < count; col += 1) {
      const spread = (col - (count - 1) / 2) * (boxW + 14)
      const along = row * step
      const parent =
        previous.length === 0
          ? null
          : rowStart[row - 1] + Math.min(previous.length - 1, Math.floor((col / count) * previous.length))
      cells.push({
        ...(vertical
          ? { x: W / 2 + spread - boxW / 2, y: 15 + along }
          : { x: 20 + along, y: H / 2 + spread - boxH / 2 }),
        kind: KINDS[Math.floor(random() * KINDS.length)],
        parent,
      })
    }
  }

  return (
    <svg className="thumb" viewBox={`0 0 ${W} ${H}`} role="img" aria-hidden="true" focusable="false">
      {cells.map((cell, index) =>
        cell.parent === null ? null : (
          <line
            key={`e${index}`}
            className="thumb-edge"
            x1={cells[cell.parent].x + boxW / 2}
            y1={cells[cell.parent].y + boxH / 2}
            x2={cell.x + boxW / 2}
            y2={cell.y + boxH / 2}
          />
        ),
      )}
      {cells.map((cell, index) => (
        <rect
          key={index}
          x={cell.x}
          y={cell.y}
          width={boxW}
          height={boxH}
          rx={shape === 'flow' ? 2 : 5}
          fill={`hsl(${KIND_HUE[cell.kind]} 62% 62%)`}
          opacity={0.9}
        />
      ))}
    </svg>
  )
}
