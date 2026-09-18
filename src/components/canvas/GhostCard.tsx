/**
 * The board the assistant is offering, before anybody has agreed to it (D83).
 *
 * Deliberately not a node. It has no id in the document, cannot be focused,
 * carries no `data-node-id` so nothing can be dropped on it, and is hidden from
 * the screen reader -- the draft panel already says "Siapkan papan retro: 12
 * simpul" in words, and reading a card that is not there would say it twice.
 * Terapkan is what turns it into something the tree knows about.
 */

import type { Landing } from '../../state/room/AssistantProvider'
import type { Point } from '../../core/shape/layout'

export function GhostCard({ landing, at, width }: { landing: Landing; at: Point; width: number }) {
  return (
    <div
      className="node-ghost"
      aria-hidden="true"
      style={{ transform: `translate(${at.x}px, ${at.y}px)`, width }}
    >
      <span className="node-ghost-kind">{landing.label}</span>
      <span className="node-ghost-title">{landing.title}</span>
      <span className="node-ghost-count">{landing.count} simpul</span>
    </div>
  )
}
