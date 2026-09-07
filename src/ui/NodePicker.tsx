/**
 * Choosing a node by name instead of by dragging.
 *
 * This component is the reason there is no drag and drop anywhere in the
 * product. Moving a node and linking two nodes both need a target, and a
 * target chosen from a searchable list works for a person who cannot use a
 * mouse, a person who cannot see the canvas, and a person doing neither.
 */

import { useMemo, useState } from 'react'
import { useRoom } from '../app/RoomContext'
import type { NodeId } from '../core/model/types'
import { KIND_LABEL } from './labels'
import { pathTo } from '../core/tree/project'

export function NodePicker({
  label,
  exclude,
  allowRoot,
  value,
  onChange,
}: {
  label: string
  exclude?: ReadonlySet<NodeId>
  allowRoot?: boolean
  value: NodeId | null
  onChange: (id: NodeId | null) => void
}) {
  const { doc, tree } = useRoom()
  const [query, setQuery] = useState('')

  const options = useMemo(() => {
    const list = tree.preorder
      .filter((id) => !exclude?.has(id))
      .map((id) => {
        const entry = tree.byId.get(id)!
        const trail = pathTo(tree, id)
          .slice(0, -1)
          .map((pid) => doc.nodes[pid]?.title)
          .filter(Boolean)
          .join(' › ')
        return { id, title: entry.node.title, kind: entry.node.kind, trail }
      })
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((o) => o.title.toLowerCase().includes(q) || o.trail.toLowerCase().includes(q))
  }, [tree, doc.nodes, exclude, query])

  const listId = `picker-${label.replace(/\s+/g, '-').toLowerCase()}`

  return (
    <div className="picker">
      <label className="field-label" htmlFor={`${listId}-q`}>
        {label}
      </label>
      <input
        id={`${listId}-q`}
        type="text"
        className="text-input"
        placeholder="Ketik untuk menyaring"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
      />
      <ul className="picker-list" role="listbox" aria-label={label} id={listId}>
        {allowRoot && (
          <li>
            <button
              type="button"
              role="option"
              aria-selected={value === null}
              className={`picker-option ${value === null ? 'is-selected' : ''}`}
              onClick={() => onChange(null)}
            >
              <span className="picker-title">Akar ruang</span>
              <span className="picker-trail">Tanpa induk</span>
            </button>
          </li>
        )}
        {options.map((o) => (
          <li key={o.id}>
            <button
              type="button"
              role="option"
              aria-selected={value === o.id}
              className={`picker-option ${value === o.id ? 'is-selected' : ''}`}
              onClick={() => onChange(o.id)}
            >
              <span className="picker-title">{o.title}</span>
              <span className="picker-trail">
                {KIND_LABEL[o.kind]}
                {o.trail ? ` · ${o.trail}` : ''}
              </span>
            </button>
          </li>
        ))}
        {options.length === 0 && (
          <li className="picker-empty">Tidak ada simpul yang cocok.</li>
        )}
      </ul>
    </div>
  )
}
