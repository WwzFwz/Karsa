/**
 * The lines between cards: the tree, the relations, and the one being drawn.
 *
 * An SVG layer under the cards rather than shapes inside it, because the cards
 * are real HTML elements (see CanvasView) and only the lines need to be drawn.
 * It is `aria-hidden` on purpose: a parent line says the same thing as the
 * outline's nesting, and a relation is already announced on the node it starts
 * from, so reading the lines too would say everything twice.
 *
 * No hooks and no state -- it is given points and draws them. Kept plain so
 * the geometry can be checked by eye and by test without a React renderer.
 */

import type { Point } from '../../core/shape/layout'

export interface Edge {
  id: string
  from: Point
  to: Point
}

export interface LabelledEdge extends Edge {
  label: string
}

/**
 * A curve that leaves and arrives along whichever axis the two points are
 * further apart on, so a line across the board bends sideways and a line down
 * the board bends downwards. Straight lines would cross cards; one rule that
 * follows the dominant direction keeps them out of the way without any
 * routing.
 */
export function curve(a: Point, b: Point): string {
  const dx = Math.abs(b.x - a.x)
  const dy = Math.abs(b.y - a.y)
  if (dx > dy) {
    const mid = (a.x + b.x) / 2
    return `M${a.x},${a.y} C${mid},${a.y} ${mid},${b.y} ${b.x},${b.y}`
  }
  const mid = (a.y + b.y) / 2
  return `M${a.x},${a.y} C${a.x},${mid} ${b.x},${mid} ${b.x},${b.y}`
}

/** Roughly how wide a label is, so its backing plate fits it. */
const LABEL_CHAR = 5.4

export function Edges({
  width,
  height,
  parents,
  relations,
  drawing,
}: {
  width: number
  height: number
  parents: Edge[]
  relations: LabelledEdge[]
  /** The line following the pointer while somebody pulls a new relation. */
  drawing: { origin: Point; at: Point } | null
}) {
  return (
    <svg className="canvas-edges" width={width} height={height} aria-hidden="true" focusable="false">
      <defs>
        <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="currentColor" />
        </marker>
      </defs>

      {parents.map((e) => (
        <path key={e.id} className="edge edge-parent" d={curve(e.from, e.to)} />
      ))}

      {drawing && (
        <path className="edge edge-drawing" d={curve(drawing.origin, drawing.at)} markerEnd="url(#arrow)" />
      )}

      {relations.map((e) => {
        const midX = (e.from.x + e.to.x) / 2
        const midY = (e.from.y + e.to.y) / 2
        const plate = e.label.length * LABEL_CHAR
        return (
          <g key={e.id}>
            <path className="edge edge-relation" d={curve(e.from, e.to)} markerEnd="url(#arrow)" />
            {/* A plate behind the words, or the line reads through them. */}
            <rect
              className="edge-label-bg"
              x={midX - plate / 2 - 6}
              y={midY - 16}
              width={plate + 12}
              height={15}
              rx={7.5}
            />
            <text className="edge-label" x={midX} y={midY - 5} textAnchor="middle">
              {e.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
