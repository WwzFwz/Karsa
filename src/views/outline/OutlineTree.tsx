/**
 * The outline. A real ARIA tree, not a stack of divs.
 *
 * role="tree" / role="treeitem" / role="group", with aria-level, aria-posinset,
 * aria-setsize, aria-expanded and a roving tabindex. Each item is named by its
 * label span through aria-labelledby, otherwise the accessible name would
 * swallow every descendant's text.
 *
 * This view is not a translation of the canvas. Both read the same projection,
 * which is why they cannot disagree. The kind icon here is the same icon on the
 * canvas card, so a sighted person and a screen reader user are describing the
 * same thing when they talk to each other.
 */

import { useEffect, useRef } from 'react'
import { useRoom } from '../../app/RoomContext'
import { useTreeKeyboard } from '../../a11y/useTreeKeyboard'
import { KIND_HUE, KIND_LABEL, RELATION_LABEL, STATE_LABEL } from '../../ui/labels'
import { toolOf } from '../../core/tools/registry'
import { Icon, KIND_ICON } from '../../ui/icons'
import { InlineTitle } from '../../ui/InlineTitle'
import type { NodeId } from '../../core/model/types'

export function OutlineTree({ compact = false }: { compact?: boolean }) {
  const room = useRoom()
  const onKeyDown = useTreeKeyboard()
  const {
    tree,
    focusId,
    setFocus,
    collapsed,
    toggleCollapse,
    doc,
    participants,
    selfId,
    draftTargets,
    editingId,
    setEditingId,
    run,
    votesOn,
    votedByMe,
  } = room
  const refs = useRef(new Map<NodeId, HTMLLIElement>())

  const wantsFocus = useRef(false)
  useEffect(() => {
    if (!focusId) return
    const el = refs.current.get(focusId)
    const container = el?.closest('[role="tree"]')
    if (!el) return
    if (wantsFocus.current || container?.contains(document.activeElement)) {
      el.focus()
      wantsFocus.current = false
    }
  }, [focusId])

  const relationsFrom = (id: NodeId) => Object.values(doc.relations).filter((r) => r.fromId === id)
  const relationsTo = (id: NodeId) => Object.values(doc.relations).filter((r) => r.toId === id)
  const commentsOn = (id: NodeId) =>
    Object.values(doc.comments).filter((c) => c.targetId === id && !c.resolvedAt)
  const pointersAt = (id: NodeId) =>
    participants.filter((p) => p.online && p.pointingNodeId === id && p.actorId !== selfId)

  // role="tree" sits on the outermost list itself. Wrapping it in a div would
  // put a generic element between tree and treeitem, which some screen readers
  // treat as a broken tree.
  const renderLevel = (ids: NodeId[], isRoot = false) => (
    <ul
      role={isRoot ? 'tree' : 'group'}
      aria-label={isRoot ? `Outline ruang ${doc.room.title}` : undefined}
      aria-multiselectable={isRoot ? false : undefined}
      className="outline-group"
      onKeyDown={isRoot ? onKeyDown : undefined}
    >
      {ids.map((id) => {
        const entry = tree.byId.get(id)!
        const node = entry.node
        const hasChildren = entry.childIds.length > 0
        const isCollapsed = collapsed.has(id)
        const outgoing = relationsFrom(id)
        const incoming = relationsTo(id)
        const comments = commentsOn(id)
        const pointing = pointersAt(id)
        const labelId = `outline-label-${id}`
        const descId = `outline-desc-${id}`
        const noteId = `outline-note-${id}`
        // The note is either shown as its own paragraph or folded into the
        // description, never both -- otherwise a screen reader reads it twice
        // and a sighted reader sees it twice.
        const showsNote = !compact && Boolean(node.note)

        const spec = toolOf(node.tool)
        // A tool's own row says what it is; each option's row carries its
        // tally. Between them the outline holds everything the card holds,
        // which is the only reason a tool is allowed to exist at all.
        const parentSpec = toolOf(entry.parentId ? doc.nodes[entry.parentId]?.tool : undefined)
        const votes = parentSpec ? votesOn(id) : 0
        const mine = parentSpec ? votedByMe(id) : false

        const descriptionBits: string[] = []
        if (spec) descriptionBits.push(`Alat ${spec.label.toLowerCase()}`)
        if (parentSpec) {
          descriptionBits.push(votes === 1 ? '1 suara' : `${votes} suara`)
          if (mine) descriptionBits.push('kamu memilih ini')
        }
        if (node.state) descriptionBits.push(`Status ${STATE_LABEL[node.state].toLowerCase()}`)
        for (const r of outgoing) {
          descriptionBits.push(`${RELATION_LABEL[r.kind]} ${doc.nodes[r.toId]?.title ?? 'simpul lain'}`)
        }
        for (const r of incoming) {
          descriptionBits.push(`dirujuk oleh ${doc.nodes[r.fromId]?.title ?? 'simpul lain'}`)
        }
        if (comments.length) descriptionBits.push(`${comments.length} komentar belum selesai`)
        if (pointing.length) {
          descriptionBits.push(`sedang ditunjuk ${pointing.map((p) => p.displayName).join(' dan ')}`)
        }
        if (node.note && !showsNote) descriptionBits.push(`Catatan: ${node.note}`)
        if (draftTargets.has(id)) descriptionBits.push('ada usulan menunggu persetujuan')

        return (
          <li
            key={id}
            role="treeitem"
            aria-level={entry.depth + 1}
            aria-posinset={entry.posInSet}
            aria-setsize={entry.setSize}
            aria-expanded={hasChildren ? !isCollapsed : undefined}
            aria-selected={focusId === id}
            aria-labelledby={labelId}
            aria-describedby={
              [descriptionBits.length ? descId : '', showsNote ? noteId : '']
                .filter(Boolean)
                .join(' ') || undefined
            }
            tabIndex={focusId === id ? 0 : -1}
            ref={(el) => {
              if (el) refs.current.set(id, el)
              else refs.current.delete(id)
            }}
            className={`outline-item ${focusId === id ? 'is-focus' : ''} ${
              pointing.length ? 'is-pointed' : ''
            } ${draftTargets.has(id) ? 'is-proposed' : ''}`}
            style={{
              ['--kh' as string]: String(KIND_HUE[node.kind]),
              ['--hue' as string]: pointing.length ? String(pointing[0].hue) : undefined,
            }}
            onClick={(e) => {
              e.stopPropagation()
              wantsFocus.current = true
              setFocus(id)
            }}
            onKeyDown={onKeyDown}
          >
            <div className="outline-row">
              <span
                className={`outline-toggle ${hasChildren ? '' : 'is-leaf'}`}
                aria-hidden="true"
                onClick={(e) => {
                  e.stopPropagation()
                  if (hasChildren) toggleCollapse(id)
                }}
              >
                <Icon name={hasChildren && !isCollapsed ? 'chevronDown' : 'chevronRight'} size={14} />
              </span>
              <Icon name={KIND_ICON[node.kind]} size={15} className="icon outline-kindicon" />
              <span className="outline-kind">{spec ? spec.label : KIND_LABEL[node.kind]}</span>
              {editingId === id ? (
                <InlineTitle
                  value={node.title}
                  className="outline-title"
                  onCommit={(title) => {
                    run({ type: 'renameNode', id, title })
                    setEditingId(null)
                  }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <span
                  className="outline-title"
                  id={labelId}
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    setEditingId(id)
                  }}
                >
                  {node.title}
                </span>
              )}
              {parentSpec && (
                <button
                  type="button"
                  className={`vote-tag ${mine ? 'is-mine' : ''}`}
                  aria-pressed={mine}
                  aria-label={`${mine ? 'Tarik pilihan dari' : 'Pilih'} ${node.title}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    run({ type: 'voteNode', id }, 'pointer')
                  }}
                >
                  <Icon name={mine ? 'check' : 'plus'} size={11} />
                  {votes}
                </button>
              )}
              {node.state && (
                <span className={`state-tag state-${node.state}`}>{STATE_LABEL[node.state]}</span>
              )}
              {comments.length > 0 && (
                <span className="count-tag">
                  <Icon name="message" size={11} />
                  {comments.length}
                </span>
              )}
              {pointing.map((p) => (
                <span
                  key={p.actorId}
                  className="pointer-tag"
                  style={{ ['--hue' as string]: String(p.hue) }}
                >
                  <Icon name="pointer" size={11} />
                  {p.displayName}
                </span>
              ))}
            </div>

            {descriptionBits.length > 0 && (
              <p className="outline-desc" id={descId}>
                {descriptionBits.map((bit) => bit.replace(/\.$/, '')).join('. ')}.
              </p>
            )}

            {showsNote && (
              <p className="outline-note" id={noteId}>
                {node.note}
              </p>
            )}

            {hasChildren && !isCollapsed && renderLevel(entry.childIds)}
          </li>
        )
      })}
    </ul>
  )

  return <div className="outline-shell">{renderLevel(tree.rootIds, true)}</div>
}
