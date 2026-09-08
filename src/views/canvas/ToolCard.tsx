/**
 * How each tool draws its own sub-tree.
 *
 * One component per tool, all of them reading the same thing: the node's
 * children. Nothing here owns data. Switch a tool off and the children are
 * still ordinary nodes in the outline, which is the property that makes tools
 * safe to try (D40).
 *
 * The columns and the quadrants carry `data-node-id` on purpose. The canvas
 * hit-test for dragging looks for the nearest `[data-node-id]`, so dropping a
 * node into a quadrant reparents it there with no extra code -- the assembly
 * gesture built for the tree works inside a card for free, and it works because
 * a quadrant really is a parent rather than a region of space.
 */

import { Icon } from '../../ui/icons'
import type { RoomDoc, NodeId } from '../../core/model/types'
import type { TreeProjection } from '../../core/tree/project'
import type { ToolSpec } from '../../core/tools/registry'

interface ToolCardProps {
  spec: ToolSpec
  id: NodeId
  doc: RoomDoc
  tree: TreeProjection
  votesOn: (id: NodeId) => number
  votedByMe: (id: NodeId) => boolean
  onVote: (id: NodeId) => void
  onFocus: (id: NodeId) => void
  /** The node a drag is currently hovering, so a quadrant can light up too. */
  dropParent: NodeId | null
}

export function ToolCard(props: ToolCardProps) {
  switch (props.spec.id) {
    case 'suara':
      return <VoteBody {...props} />
    case 'retro':
      return <ColumnsBody {...props} />
    case 'matriks':
      return <QuadrantBody {...props} />
  }
}

/** Options with their tally. The bar is decoration; the number is the fact. */
function VoteBody({ spec, id, doc, tree, votesOn, votedByMe, onVote }: ToolCardProps) {
  const childIds = tree.byId.get(id)?.childIds ?? []
  const most = childIds.reduce((top, child) => Math.max(top, votesOn(child)), 0)

  return (
    <ul className="tool-options">
      {childIds.map((childId) => {
        const option = doc.nodes[childId]
        if (!option) return null
        const votes = votesOn(childId)
        const mine = votedByMe(childId)
        return (
          <li key={childId} className={`tool-option ${mine ? 'is-mine' : ''}`} data-node-id={childId}>
            <button
              type="button"
              className="tool-vote"
              aria-pressed={mine}
              aria-label={`${mine ? 'Tarik pilihan dari' : 'Pilih'} ${option.title}, ${votes} suara`}
              onClick={(event) => {
                event.stopPropagation()
                onVote(childId)
              }}
            >
              <Icon name={mine ? 'check' : 'plus'} size={12} />
            </button>
            <span className="tool-option-title">{option.title}</span>
            <span className="tool-count" aria-hidden="true">
              {votes}
            </span>
            <span
              className="tool-bar"
              aria-hidden="true"
              style={{ ['--fill' as string]: `${votes === 0 ? 0 : (votes / Math.max(1, most)) * 100}%` }}
            />
          </li>
        )
      })}
      {childIds.length === 0 && <li className="tool-empty">Belum ada {spec.itemWord}.</li>}
    </ul>
  )
}

/** Retro: one column per child group, its items listed underneath. */
function ColumnsBody({ spec, id, doc, tree, onFocus, dropParent }: ToolCardProps) {
  const columnIds = tree.byId.get(id)?.childIds ?? []
  return (
    <div className="tool-columns" style={{ ['--cols' as string]: String(Math.max(1, columnIds.length)) }}>
      {columnIds.map((columnId) => {
        const column = doc.nodes[columnId]
        if (!column) return null
        const itemIds = tree.byId.get(columnId)?.childIds ?? []
        return (
          <section
            key={columnId}
            className={`tool-column ${dropParent === columnId ? 'is-droptarget' : ''}`}
            data-node-id={columnId}
          >
            <h4 className="tool-column-head">{column.title}</h4>
            <ul className="tool-items">
              {itemIds.map((itemId) => {
                const item = doc.nodes[itemId]
                if (!item) return null
                return (
                  <li key={itemId} className="tool-item" data-node-id={itemId}>
                    <button
                      type="button"
                      className="tool-item-btn"
                      onClick={(event) => {
                        event.stopPropagation()
                        onFocus(itemId)
                      }}
                    >
                      {item.title}
                    </button>
                  </li>
                )
              })}
              {itemIds.length === 0 && <li className="tool-empty">Kosong</li>}
            </ul>
          </section>
        )
      })}
      {columnIds.length === 0 && <p className="tool-empty">Belum ada {spec.itemWord}.</p>}
    </div>
  )
}

/**
 * The matrix, and the argument rule 2 has been making all along.
 *
 * A quadrant is a group node, not a region of space. So an item's position is
 * its place in the tree, which means the outline can say "Dampak besar - usaha
 * kecil > Praktikum aksesibilitas" in words -- exactly what a 2x2 in Miro loses
 * for anyone who cannot see it. Moving an item between quadrants is `moveNode`
 * and nothing else, so it is undoable, narratable and attributable without a
 * line written for any of those.
 */
function QuadrantBody({ spec, id, doc, tree, onFocus, dropParent }: ToolCardProps) {
  const cellIds = tree.byId.get(id)?.childIds ?? []
  return (
    <div className="tool-grid">
      {cellIds.slice(0, 4).map((cellId) => {
        const cell = doc.nodes[cellId]
        if (!cell) return null
        const itemIds = tree.byId.get(cellId)?.childIds ?? []
        return (
          <section
            key={cellId}
            className={`tool-cell ${dropParent === cellId ? 'is-droptarget' : ''}`}
            data-node-id={cellId}
          >
            <h4 className="tool-cell-head">{cell.title}</h4>
            <ul className="tool-items">
              {itemIds.map((itemId) => {
                const item = doc.nodes[itemId]
                if (!item) return null
                return (
                  <li key={itemId} className="tool-item" data-node-id={itemId}>
                    <button
                      type="button"
                      className="tool-item-btn"
                      onClick={(event) => {
                        event.stopPropagation()
                        onFocus(itemId)
                      }}
                    >
                      {item.title}
                    </button>
                  </li>
                )
              })}
              {itemIds.length === 0 && <li className="tool-empty">Kosong</li>}
            </ul>
          </section>
        )
      })}
      {cellIds.length === 0 && <p className="tool-empty">Belum ada {spec.itemWord}.</p>}
    </div>
  )
}
