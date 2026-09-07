/**
 * The canvas. Same projection, same keyboard, drawn spatially.
 *
 * Three deliberate choices:
 *
 * 1. Nodes are HTML elements positioned over an SVG edge layer, not shapes
 *    inside the SVG. Focus, roving tabindex and ARIA behave on real elements;
 *    on <g> elements they do not.
 * 2. Kind is carried four ways at once -- icon, word, hue and card silhouette.
 *    Colour alone would fail anyone who cannot separate these hues, and the
 *    silhouette borrows the flowchart vocabulary people already read.
 * 3. There is no drag and drop. Position carries no meaning (rule 2), so
 *    dragging would be a gesture that changes nothing -- and making it change
 *    something would lock out anyone who cannot use a mouse.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useDialogs } from '../../app/DialogContext'
import { useRoom } from '../../app/RoomContext'
import { useTreeKeyboard } from '../../a11y/useTreeKeyboard'
import { layoutFor, NODE_H, NODE_W } from '../../core/shape/layout'
import { KIND_HUE, KIND_LABEL, RELATION_LABEL, SHAPE_LABEL, STATE_LABEL } from '../../ui/labels'
import { Icon, KindGlyph } from '../../ui/icons'
import { InlineTitle } from '../../ui/InlineTitle'
import { AgentCursor } from '../../features/voice/AgentCursor'
import type { NodeId } from '../../core/model/types'

const PAD = 52

export function CanvasView() {
  const room = useRoom()
  const onKeyDown = useTreeKeyboard()
  const {
    doc,
    tree,
    visibleIds,
    focusId,
    setFocus,
    participants,
    selfId,
    collapsed,
    draftTargets,
    agentTargetId,
    setCanvasMounted,
    editingId,
    setEditingId,
    run,
    linkingFrom,
    startLinking,
    cancelLinking,
  } = room
  const dialogs = useDialogs()

  /*
    Add a child straight from the node: create it with a working title and drop
    into the inline editor on it. One gesture instead of a dialog, and still one
    narrated, undoable command.
  */
  const addChild = useCallback(
    (parentId: NodeId) => {
      const result = run({ type: 'createNode', parentId, kind: 'idea', title: 'Gagasan baru' })
      if (!result.ok) return
      const created = result.events.find((e) => e.type === 'createNode')?.payload.nodeId
      if (created) setEditingId(created as NodeId)
    },
    [run, setEditingId],
  )

  /** Second half of a two-pick link: the kind is still chosen deliberately. */
  const finishLink = useCallback(
    (targetId: NodeId) => {
      if (!linkingFrom || linkingFrom === targetId) {
        cancelLinking()
        return
      }
      dialogs.open({ kind: 'relate', nodeId: linkingFrom, presetTarget: targetId })
      cancelLinking()
    },
    [linkingFrom, cancelLinking, dialogs],
  )

  // The dock keeps the proposal when no canvas is on screen, so the outline
  // page is never left without a way to answer.
  useEffect(() => {
    setCanvasMounted(true)
    return () => setCanvasMounted(false)
  }, [setCanvasMounted])

  const refs = useRef(new Map<NodeId, HTMLLIElement>())
  const viewportRef = useRef<HTMLDivElement>(null)
  const visible = useMemo(() => new Set(visibleIds), [visibleIds])

  // A click sets the focused id through React state, so the DOM focus has to
  // follow after the re-render -- otherwise the single-letter shortcuts would
  // work after arrow keys but not after a click.
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

  const layout = useMemo(
    () => layoutFor(doc.room.shape, tree, visible),
    [doc.room.shape, tree, visible],
  )

  /*
    Keep the focused node in view.

    Without this the canvas opens on whatever happens to be at scroll zero --
    for a mind map that is the top edge, not the root -- and arrowing through a
    large tree walks the focus ring straight off the screen. It scrolls the
    minimum needed, so the diagram does not jump around under someone working
    near an edge.

    Deferred by one frame and repeated on resize, because the viewport's height
    is not final on the first pass and scrolling against a stale height lands
    the node just off the bottom edge.
  */
  const ensureVisible = useCallback(
    (id: NodeId | null, smooth: boolean) => {
      const vp = viewportRef.current
      if (!vp || !id) return
      const p = layout.positions.get(id)
      if (!p) return

      const margin = 40
      const x = p.x + PAD
      const y = p.y + PAD
      const left = vp.scrollLeft
      const top = vp.scrollTop
      let nextLeft = left
      let nextTop = top

      if (x - margin < left) nextLeft = Math.max(0, x - margin)
      else if (x + NODE_W + margin > left + vp.clientWidth) {
        nextLeft = x + NODE_W + margin - vp.clientWidth
      }
      if (y - margin < top) nextTop = Math.max(0, y - margin)
      else if (y + NODE_H + margin > top + vp.clientHeight) {
        nextTop = y + NODE_H + margin - vp.clientHeight
      }

      if (Math.abs(nextLeft - left) < 1 && Math.abs(nextTop - top) < 1) return
      const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      vp.scrollTo({ left: nextLeft, top: nextTop, behavior: still || !smooth ? 'auto' : 'smooth' })
    },
    [layout],
  )

  useEffect(() => {
    // One pass next frame, then two more as the stylesheet and the dock settle.
    // Measuring once is not enough: on a cold load the viewport briefly reports
    // its unconstrained height, which makes every node look already visible.
    const frame = requestAnimationFrame(() => ensureVisible(focusId, true))
    const late = [220, 600].map((delay) =>
      window.setTimeout(() => ensureVisible(focusId, false), delay),
    )
    return () => {
      cancelAnimationFrame(frame)
      late.forEach((id) => window.clearTimeout(id))
    }
  }, [focusId, ensureVisible])

  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    const observer = new ResizeObserver(() => ensureVisible(focusId, false))
    observer.observe(vp)
    return () => observer.disconnect()
  }, [focusId, ensureVisible])

  const centreOf = (id: NodeId) => {
    const p = layout.positions.get(id)
    if (!p) return null
    return { x: p.x + NODE_W / 2 + PAD, y: p.y + NODE_H / 2 + PAD }
  }

  const parentEdges = visibleIds
    .map((id) => {
      const entry = tree.byId.get(id)
      if (!entry?.parentId || !visible.has(entry.parentId)) return null
      const from = centreOf(entry.parentId)
      const to = centreOf(id)
      if (!from || !to) return null
      return { id: `p-${id}`, from, to }
    })
    .filter(Boolean) as { id: string; from: { x: number; y: number }; to: { x: number; y: number } }[]

  const relationEdges = Object.values(doc.relations)
    .map((r) => {
      if (!visible.has(r.fromId) || !visible.has(r.toId)) return null
      const from = centreOf(r.fromId)
      const to = centreOf(r.toId)
      if (!from || !to) return null
      return { id: r.id, from, to, label: r.label ?? RELATION_LABEL[r.kind] }
    })
    .filter(Boolean) as {
    id: string
    from: { x: number; y: number }
    to: { x: number; y: number }
    label: string
  }[]

  const pointersAt = (id: NodeId) =>
    participants.filter((p) => p.online && p.pointingNodeId === id && p.actorId !== selfId)
  const focusedBy = (id: NodeId) =>
    participants.filter((p) => p.online && p.focusNodeId === id && p.actorId !== selfId)

  const stageW = layout.width + PAD * 2
  const stageH = layout.height + PAD * 2

  // Where the agent stands: just off the corner of the node it is talking about.
  const agentAnchor = agentTargetId ? layout.positions.get(agentTargetId) : undefined
  const agentPoint = agentAnchor
    ? { x: agentAnchor.x + PAD + NODE_W - 18, y: agentAnchor.y + PAD + NODE_H - 10 }
    : null

  return (
    <div className="canvas-viewport" ref={viewportRef}>
      <div className="canvas-stage" style={{ width: stageW, height: stageH }}>
        <svg className="canvas-edges" width={stageW} height={stageH} aria-hidden="true" focusable="false">
          <defs>
            <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="currentColor" />
            </marker>
          </defs>
          {parentEdges.map((e) => (
            <path key={e.id} className="edge edge-parent" d={curve(e.from, e.to)} />
          ))}
          {relationEdges.map((e) => (
            <g key={e.id}>
              <path className="edge edge-relation" d={curve(e.from, e.to)} markerEnd="url(#arrow)" />
              <rect
                className="edge-label-bg"
                x={(e.from.x + e.to.x) / 2 - (e.label.length * 5.4) / 2 - 6}
                y={(e.from.y + e.to.y) / 2 - 16}
                width={e.label.length * 5.4 + 12}
                height={15}
                rx={7.5}
              />
              <text
                className="edge-label"
                x={(e.from.x + e.to.x) / 2}
                y={(e.from.y + e.to.y) / 2 - 5}
                textAnchor="middle"
              >
                {e.label}
              </text>
            </g>
          ))}
        </svg>

        {/*
          A flat tree: aria-level, aria-posinset and aria-setsize carry the
          hierarchy, which the ARIA pattern allows and which suits a spatial
          layout where DOM nesting would fight the positioning.
        */}
        <ul
          role="tree"
          aria-label={`Kanvas ruang ${doc.room.title}, bentuk ${SHAPE_LABEL[doc.room.shape].toLowerCase()}`}
          aria-multiselectable={false}
          className="canvas-nodes"
          onKeyDown={onKeyDown}
        >
          {visibleIds.map((id) => {
            const entry = tree.byId.get(id)!
            const node = entry.node
            const pos = layout.positions.get(id)
            if (!pos) return null
            const pointing = pointersAt(id)
            const watching = focusedBy(id).filter((p) => !pointing.includes(p))
            const comments = Object.values(doc.comments).filter(
              (c) => c.targetId === id && !c.resolvedAt,
            )
            const hasChildren = entry.childIds.length > 0
            const hue = KIND_HUE[node.kind]

            return (
              <li
                key={id}
                role="treeitem"
                aria-level={entry.depth + 1}
                aria-posinset={entry.posInSet}
                aria-setsize={entry.setSize}
                aria-expanded={hasChildren ? !collapsed.has(id) : undefined}
                aria-selected={focusId === id}
                aria-label={`${KIND_LABEL[node.kind]} ${node.title}${
                  node.state ? `, ${STATE_LABEL[node.state].toLowerCase()}` : ''
                }${comments.length ? `, ${comments.length} komentar` : ''}${
                  pointing.length
                    ? `, ditunjuk ${pointing.map((p) => p.displayName).join(' dan ')}`
                    : ''
                }${draftTargets.has(id) ? ', ada usulan menunggu persetujuan' : ''}`}
                tabIndex={focusId === id ? 0 : -1}
                className={`node node-${node.kind} ${focusId === id ? 'is-focus' : ''} ${
                  pointing.length ? 'is-pointed' : ''
                } ${draftTargets.has(id) ? 'is-proposed' : ''} ${
                  linkingFrom && linkingFrom !== id ? 'is-linktarget' : ''
                } ${linkingFrom === id ? 'is-linksource' : ''}`}
                style={{
                  transform: `translate(${pos.x + PAD}px, ${pos.y + PAD}px)`,
                  width: NODE_W,
                  minHeight: NODE_H,
                  ['--kh' as string]: String(hue),
                }}
                ref={(el) => {
                  if (el) refs.current.set(id, el)
                  else refs.current.delete(id)
                }}
                onClick={() => {
                  if (linkingFrom) {
                    finishLink(id)
                    return
                  }
                  wantsFocus.current = true
                  setFocus(id)
                }}
                onKeyDown={onKeyDown}
              >
                <span
                  className="node-bar"
                  style={{ background: `hsl(${hue} 58% 50%)` }}
                  aria-hidden="true"
                />
                <span className="node-head" aria-hidden="true">
                  <KindGlyph kind={node.kind} />
                  {KIND_LABEL[node.kind]}
                </span>
                {editingId === id ? (
                  <InlineTitle
                    value={node.title}
                    className="node-title"
                    onCommit={(title) => {
                      run({ type: 'renameNode', id, title })
                      setEditingId(null)
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <span
                    className="node-title"
                    onDoubleClick={(event) => {
                      event.stopPropagation()
                      setEditingId(id)
                    }}
                  >
                    {node.title}
                  </span>
                )}
                {draftTargets.has(id) && (
                  <span className="node-proposed" aria-hidden="true">
                    <Icon name="sparkles" size={11} />
                    usulan menunggu
                  </span>
                )}
                {(node.state || comments.length > 0 || node.note) && (
                  <span className="node-tags" aria-hidden="true">
                    {node.state && (
                      <span className={`state-tag state-${node.state}`}>{STATE_LABEL[node.state]}</span>
                    )}
                    {comments.length > 0 && (
                      <span className="count-tag">
                        <Icon name="message" size={11} />
                        {comments.length}
                      </span>
                    )}
                    {node.note && (
                      <span className="count-tag" title="Punya catatan">
                        <Icon name="fileText" size={11} />
                      </span>
                    )}
                  </span>
                )}

                {pointing.length > 0 && (
                  <span
                    className="node-pointer"
                    style={{ ['--hue' as string]: String(pointing[0].hue) }}
                    aria-hidden="true"
                    title={`${pointing.map((p) => p.displayName).join(' dan ')} menunjuk simpul ini`}
                  >
                    <Icon name="pointer" size={12} />
                  </span>
                )}

                {focusId === id && !editingId && !linkingFrom && (
                  <span className="node-handles">
                    <button
                      type="button"
                      className="node-handle"
                      aria-label={`Tambah simpul anak di bawah ${node.title}`}
                      title="Tambah anak (n)"
                      onClick={(event) => {
                        event.stopPropagation()
                        addChild(id)
                      }}
                    >
                      <Icon name="plus" size={13} />
                    </button>
                    <button
                      type="button"
                      className="node-handle"
                      aria-label={`Hubungkan ${node.title} ke simpul lain`}
                      title="Hubungkan, lalu pilih tujuannya (r)"
                      onClick={(event) => {
                        event.stopPropagation()
                        startLinking(id)
                      }}
                    >
                      <Icon name="link" size={13} />
                    </button>
                  </span>
                )}

                {(pointing.length > 0 || watching.length > 0) && (
                  <span className="node-people" aria-hidden="true">
                    {[...pointing, ...watching].map((p) => (
                      <span
                        key={p.actorId}
                        className={`avatar ${p.talking ? 'is-talking' : ''}`}
                        style={{ ['--hue' as string]: String(p.hue) }}
                        title={p.displayName}
                      >
                        {p.displayName.charAt(0)}
                      </span>
                    ))}
                  </span>
                )}
              </li>
            )
          })}
        </ul>

        {agentPoint && (
          <AgentCursor
            at={agentPoint}
            targetTitle={agentTargetId ? (doc.nodes[agentTargetId]?.title ?? null) : null}
            flipX={agentPoint.x > stageW - 400}
            flipY={agentPoint.y > stageH - 330}
          />
        )}
      </div>
    </div>
  )
}

/** Gentle S-curve. Straight lines cross badly once relations fan out. */
function curve(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const dx = Math.abs(b.x - a.x)
  const dy = Math.abs(b.y - a.y)
  if (dx > dy) {
    const mid = (a.x + b.x) / 2
    return `M${a.x},${a.y} C${mid},${a.y} ${mid},${b.y} ${b.x},${b.y}`
  }
  const mid = (a.y + b.y) / 2
  return `M${a.x},${a.y} C${a.x},${mid} ${b.x},${mid} ${b.x},${b.y}`
}
