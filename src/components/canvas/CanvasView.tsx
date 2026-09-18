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
 * 3. Dragging is offered but never required (D6b). Dragging a node onto empty
 *    ground places it -- a device-local opinion that never enters the document
 *    (D31) -- and dragging it onto another node proposes making it a child
 *    there. Both have a keyboard route: hand placement is optional decoration,
 *    and the reparent is `m` or the command list. What a drag may never be is
 *    the only way to reach an operation.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useDialogs } from '../../state/dialogs/DialogProvider'
import { useAnnouncer } from '../../a11y/Announcer'
import { useDocument } from '../../state/room/DocumentProvider'
import { usePresence } from '../../state/room/PresenceProvider'
import { useView } from '../../state/room/ViewProvider'
import { useAssistant } from '../../state/room/AssistantProvider'
import { useTreeKeyboard } from '../../a11y/useTreeKeyboard'
import { layoutFor, NODE_H, NODE_W, sizeOf } from '../../core/shape/layout'
import { toolOf } from '../../core/tools/registry'
import { RELATION_LABEL, SHAPE_LABEL } from '../../core/vocabulary'
import { AgentCursor } from '../voice/AgentCursor'
import { Edges, type Edge, type LabelledEdge } from './Edges'
import { GhostCard } from './GhostCard'
import { NodeCard } from './NodeCard'
import { ZoomBar } from './ZoomBar'
import { useChromeInsets } from './useChromeInsets'
import { useBoardView, MIN_ZOOM, MAX_ZOOM } from './useBoardView'
import { useFocusInView } from './useFocusInView'
import { useNodeDrag } from './useNodeDrag'
import type { NodeId } from '../../core/model/types'
import type { Point } from '../../core/shape/layout'

export function CanvasView() {
  const { doc, tree, votedByMe, votesOn, run } = useDocument()
  const { participants, selfId } = usePresence()
  const { canvasIds: visibleIds, focusId, setFocus, collapsed, setCanvasMounted, editingId, setEditingId, linkingFrom, startLinking, cancelLinking, nodeOverrides, setNodeOverride, panelHidden, focusMode } = useView()
  const { draftTargets, agentTargetId, draftLanding } = useAssistant()
  const onKeyDown = useTreeKeyboard()
  const dialogs = useDialogs()
  const { announce } = useAnnouncer()

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
  const registerCard = useCallback((id: NodeId, el: HTMLLIElement | null) => {
    if (el) refs.current.set(id, el)
    else refs.current.delete(id)
  }, [])
  const viewportRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  /*
    Figma and Miro both teach the same gesture: approach a shape, anchors appear
    on its edges, pull one out and a line follows the pointer until you drop it
    on something. Borrowing it costs nothing and saves explaining.

    What is ours is that the drag is never the only way. Releasing without
    moving falls through to the two-pick flow, and `r` plus the target picker is
    still there for the keyboard. The rule this refines is D6, which used to ban
    dragging outright: the real requirement is that no operation may be
    drag-only, because a drag needs sustained pressure and a precise path.
    Drawing a relation stores two ids and no path, so the gesture itself is
    safe once an alternative exists.
  */
  type DragLink = { fromId: NodeId; origin: Point; at: Point; moved: boolean }
  const [dragLink, setDragLink] = useState<DragLink | null>(null)
  /*
    The ref carries the truth, the state only draws it. Without this the first
    pointermove after pointerdown reads a closure from before the re-render and
    the line never starts -- a real race, not just a test artefact.
  */
  const dragRef = useRef<DragLink | null>(null)

  /*
    Panning the board by dragging its empty ground, the way FigJam does, plus
    the middle button anywhere. Scrollbars alone made a large diagram feel
    locked in place.

    This is navigation and nothing else -- it moves the viewport, never a node,
    so it cannot collide with rule 2 or with D6. The keyboard equivalent already
    exists and is better: arrowing through the tree scrolls the focused node
    into view on its own.

    Space is deliberately not a modifier here. It is the talk switch, and the
    person who most needs panning is often the one holding it.

  /*
    Zoom, because a diagram that outgrows the window should be shrinkable rather
    than clipped. Local navigation only: it changes nothing in the document, and
    two people may sit at different zoom levels without disagreeing about
    anything, because pointing is by node id and never by position.
  */
  /*
    The real fix for content sliding under the chrome.

    Insetting the *content* is what keeps a node from being sliced in half by a
    floating bar. Nudging the scroll position only ever rescued the focused
    node; every other node still passed underneath. Now the scrollable area
    carries the chrome as padding, so at either end of a scroll every node sits
    in clear space, and there is always a scroll position that shows any node
    whole.
  */
  const { inset, viewBox } = useChromeInsets({ viewportRef, watch: [panelHidden, focusMode] })

  /*
    A board wider than the window, with the diagram centred in it.

    The earlier version reserved a gutter the size of the chrome and then a
    margin the size of the viewport. Both were wrong in the same way: they were
    dead zones the diagram could not enter, and at low zoom they pushed
    everything into a corner. A board that is simply larger than the window,
    with the content in the middle, does the job without any of that.
  */


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

  /*
    What the cards actually turned out to be.

    A card is as tall as its title wraps plus whatever tags it carries, and no
    constant can know that in advance -- NODE_H was only ever the height of the
    shortest possible card, so every long title quietly overlapped the sibling
    below it. The canvas measures what it painted and hands the numbers to the
    layout, which spaces the next frame with real heights.

    It cannot chase its own tail because nothing sets an explicit height:
    content decides how tall a card is, and the layout decides only the gaps.
  */
  const [measured, setMeasured] = useState<ReadonlyMap<NodeId, number>>(() => new Map())

  const computed = useMemo(
    () => layoutFor(doc.room.shape, tree, visible, measured),
    [doc.room.shape, tree, visible, measured],
  )

  /*
    Auto layout first, hand placement on top. Overrides are a thin sheet over a
    computed arrangement rather than a replacement for it, so a node that was
    never touched keeps moving with its branch, and switching shape simply
    stops consulting this shape's sheet.
  */
  const layout = useMemo(() => {
    const keys = Object.keys(nodeOverrides)
    if (keys.length === 0) return { ...computed, minX: 0, minY: 0 }
    const positions = new Map(computed.positions)
    for (const id of keys) {
      if (positions.has(id)) positions.set(id, nodeOverrides[id])
    }
    let width = 0
    let height = 0
    /*
      How far a hand placement has reached past the layout's own origin. Auto
      layout never goes negative, so this is zero until somebody carries a node
      up or to the left -- and then it is what keeps the board growing that way
      too, exactly as `width` and `height` grow the other two.
    */
    let minX = 0
    let minY = 0
    for (const p of positions.values()) {
      width = Math.max(width, p.x + NODE_W)
      height = Math.max(height, p.y + NODE_H)
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
    }
    return {
      positions,
      width: Math.max(width, computed.width),
      height: Math.max(height, computed.height),
      minX,
      minY,
    }
  }, [computed, nodeOverrides])


  /*
    The board has a coordinate space, not a corner.

    Auto layout starts at 0,0, and clamping hand placement to that origin meant
    a node could never be moved above or to the left of where the algorithm
    happened to put the first one. If every node has a coordinate, every
    coordinate on the board should be available to it. ORIGIN is how much room
    exists on the negative side of the layout's own origin.

    It is a floor, not a ceiling. A fixed ORIGIN made the board grow in two
    directions and stop dead in the other two: rightwards and downwards the
    stage follows `layout.width` and `layout.height`, so it never runs out,
    while leftwards and upwards there was exactly ORIGIN and then a wall. The
    room on the negative side now follows the furthest placement the same way,
    which leaves ORIGIN of clear board past it whichever way somebody goes.
  */
  const ORIGIN = 800
  const originX = ORIGIN - layout.minX
  const originY = ORIGIN - layout.minY

  /*
    Where the board sits and how big it is. It needs the diagram's reach and
    the origin that follows it, so it is called once both are known.
  */
  const board = useBoardView({
    viewportRef,
    stageRef,
    reach: layout,
    origin: { x: originX, y: originY },
    slack: ORIGIN,
    inset,
    viewBox,
  })
  const { zoom, zoomAt, zoomToFit, toStage, panning } = board
  const stageW = board.stage.w
  const stageH = board.stage.h
  const sizerW = board.sizer.w
  const sizerH = board.sizer.h
  const offsetX = board.offset.x
  const offsetY = board.offset.y

  /*
    The board is always larger than the window by at least the chrome it hides
    behind.

    Sizing it to `max(window, content)` looked right and was the bug: when the
    diagram fitted, scrollWidth equalled clientWidth, the scroll range was zero,
    and any node sitting under the inspector could never be pulled out from
    under it. Scroll range has to exist precisely where a panel covers the
    canvas, or that strip of board is unreachable.
  */

  /*
    Carrying a card by hand, and the board following when it reaches the edge.
    The machinery is `useNodeDrag`; what stays here is what it needs to know
    about this board and what to do when a card lands on another one.
  */
  const drag = useNodeDrag({
    viewportRef,
    zoom,
    doc,
    tree,
    origin: { x: originX, y: originY },
    extent: { w: layout.width, h: layout.height },
    slack: ORIGIN,
    nodeWidth: NODE_W,
    setNodeOverride,
    onDropOnto: (id, parentId) => dialogs.open({ kind: 'move', nodeId: id, presetParent: parentId }),
  })

  /*
    Growing the board leftwards moves every node's stage coordinate right by the
    same amount, so without this the whole diagram would jump sideways the
    instant a placement crossed the old edge. Board coordinate zero is pinned to
    the screen instead: measure where it sits, and when the origin moves, give
    the scroll the difference back.

    A drag in flight is measured from the scroll position it started at, so that
    has to shift too, or the node would lurch away from the hand carrying it.
  */
  const stageOriginX = offsetX + originX * zoom
  const stageOriginY = offsetY + originY * zoom
  const anchorRef = useRef({ originX, originY, stageOriginX, stageOriginY })
  useLayoutEffect(() => {
    const vp = viewportRef.current
    const prev = anchorRef.current
    anchorRef.current = { originX, originY, stageOriginX, stageOriginY }
    if (!vp) return
    const dx = prev.originX === originX ? 0 : stageOriginX - prev.stageOriginX
    const dy = prev.originY === originY ? 0 : stageOriginY - prev.stageOriginY
    if (!dx && !dy) return
    vp.scrollLeft += dx
    vp.scrollTop += dy
    drag.shiftBy(dx, dy)
  }, [originX, originY, stageOriginX, stageOriginY, drag])


  /*
    Where a board that does not exist yet is drawn.

    Beside the node it will hang from, so the attachment is visible without
    pretending to know the arrangement the layout will settle on; out in clear
    board when it lands as its own root, because then there is nothing to be
    beside.

    It does not go through the real layout because it is a preview, not a node:
    it is not in the document, cannot be focused, and must never be a drop
    target. Terapkan is what turns it into something the tree knows about.
  */
  const ghost = (() => {
    if (!draftLanding || layout.positions.has(draftLanding.id)) return null
    const parent = draftLanding.parentId ? layout.positions.get(draftLanding.parentId) : undefined
    const at = parent
      ? { x: parent.x + NODE_W + 110, y: parent.y }
      : { x: layout.width + 140, y: (layout.minY + layout.height) / 2 - NODE_H }
    return { ...draftLanding, at }
  })()

  const positionOf = (id: NodeId): Point | undefined =>
    ghost && id === ghost.id ? ghost.at : layout.positions.get(id)

  useFocusInView({
    focusId,
    viewportRef,
    positionOf,
    nodeSize: { w: NODE_W, h: NODE_H },
    origin: { x: originX, y: originY },
    offset: { x: offsetX, y: offsetY },
    zoom,
    dragging: drag.isCarrying,
  })


  /** Put the diagram in the middle of the free space, not the middle of the window. */

  const centreOf = (id: NodeId) => {
    const p = positionOf(id)
    if (!p) return null
    const size = sizeOf(tree, id)
    return { x: p.x + originX + size.w / 2, y: p.y + originY + size.h / 2 }
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
    .filter(Boolean) as Edge[]

  const relationEdges = Object.values(doc.relations)
    .map((r) => {
      if (!visible.has(r.fromId) || !visible.has(r.toId)) return null
      const from = centreOf(r.fromId)
      const to = centreOf(r.toId)
      if (!from || !to) return null
      return { id: r.id, from, to, label: r.label ?? RELATION_LABEL[r.kind] }
    })
    .filter(Boolean) as LabelledEdge[]

  const pointersAt = (id: NodeId) =>
    participants.filter((p) => p.online && p.pointingNodeId === id && p.actorId !== selfId)
  const focusedBy = (id: NodeId) =>
    participants.filter((p) => p.online && p.focusNodeId === id && p.actorId !== selfId)

  /*
    The chrome padding lives on the sizer, outside the scaled stage.

    Putting it inside meant it shrank with the zoom: fitting a diagram to 47%
    also shrank the clearance to 47%, and the nodes went straight back under the
    bars. Screen-space gutters have to stay screen-space.
  */
  /*
    A board much larger than the diagram, with the diagram sitting in the middle
    of it.

    This is what makes the floating chrome harmless: the bars cover empty board,
    not content. Trying to solve it by insetting the content only worked at the
    edges of a scroll -- anything in the middle of a large diagram still passed
    underneath. Margins are screen-space and do not scale, so zooming out does
    not shrink the clearance with it.
  */

  // Where the agent stands: just off the corner of the node it is talking about.
  const agentAnchor = agentTargetId ? positionOf(agentTargetId) : undefined
  const agentPoint = agentAnchor
    ? { x: agentAnchor.x + originX + NODE_W - 18, y: agentAnchor.y + originY + NODE_H - 10 }
    : null

  /*
    Fit on arrival when the diagram is bigger than the space it has.

    Padding alone only clears the nodes at the edges of the scroll; anything in
    the middle of a large diagram still passes under a floating bar. Opening at
    a zoom where the whole thing fits means nothing has to pass under anything.
  */


  useLayoutEffect(() => {
    let changed = false
    const next = new Map<NodeId, number>(measured)
    for (const [id, el] of refs.current.entries()) {
      const height = el.offsetHeight
      if (height <= 0) continue
      // A pixel of jitter is not news, and reacting to it would relayout forever.
      if (Math.abs((next.get(id) ?? 0) - height) > 1) {
        next.set(id, height)
        changed = true
      }
    }
    for (const id of [...next.keys()]) {
      if (!refs.current.has(id)) {
        next.delete(id)
        changed = true
      }
    }
    if (changed) setMeasured(next)
  })

  return (
    <>
    <div
      className={`canvas-viewport ${panning ? 'is-panning' : ''}`}
      ref={viewportRef}
      onPointerDown={(event) => {
        const middle = event.button === 1
        const onObject = (event.target as HTMLElement).closest('.node, .node-anchor, .agent')
        if (!middle && (onObject || event.button !== 0)) return
        const vp = viewportRef.current
        if (!vp) return
        event.preventDefault()
        board.pan.start(event)
        vp.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
        // A carry wins over a pan: the two gestures start the same way.
        if (drag.move(event)) return
        board.pan.move(event)
      }}
      onPointerUp={(event) => {
        drag.finish()
        board.pan.stop()
        viewportRef.current?.releasePointerCapture(event.pointerId)
      }}
      onPointerCancel={() => {
        drag.cancel()
        board.pan.stop()
      }}
      onWheel={(event) => {
        if (!event.ctrlKey && !event.metaKey) return
        event.preventDefault()
        zoomAt(zoom * (event.deltaY > 0 ? 0.92 : 1.08), event.clientX, event.clientY)
      }}
    >
      <div
        className="canvas-sizer"
        style={{ width: sizerW, height: sizerH }}
      >
      <div
        className={`canvas-stage ${dragLink ? 'is-linking' : ''}`}
        style={{
          width: stageW,
          height: stageH,
          transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`,
        }}
        ref={stageRef}
        onPointerMove={(event) => {
          const current = dragRef.current
          if (!current) return
          const at = toStage(event.clientX, event.clientY)
          const moved =
            current.moved || Math.hypot(at.x - current.origin.x, at.y - current.origin.y) > 6
          const next = { ...current, at, moved }
          dragRef.current = next
          setDragLink(next)
        }}
        onPointerUp={(event) => {
          const current = dragRef.current
          if (!current) return
          const { fromId, moved } = current
          dragRef.current = null
          setDragLink(null)
          if (!moved) {
            // A tap on the anchor, not a pull. Fall through to two picks.
            startLinking(fromId)
            return
          }
          /*
            elementsFromPoint, not elementFromPoint: the topmost thing under the
            cursor is often the anchor dot itself or a floating panel, and the
            node underneath is the one that was aimed at.
          */
          const stack = document.elementsFromPoint(event.clientX, event.clientY)
          const under = stack.map((el) => el.closest('[data-node-id]')).find(Boolean)
          const targetId = under?.getAttribute('data-node-id') ?? null
          if (targetId && targetId !== fromId) {
            dialogs.open({ kind: 'relate', nodeId: fromId, presetTarget: targetId })
          } else {
            // Never fail silently. A line that vanishes with no word looks broken.
            announce('Tidak ada simpul di titik itu. Penghubungan dibatalkan.')
          }
        }}
        onPointerCancel={() => {
          dragRef.current = null
          setDragLink(null)
        }}
      >
        <Edges
          width={stageW}
          height={stageH}
          parents={parentEdges}
          relations={relationEdges}
          drawing={dragLink?.moved ? { origin: dragLink.origin, at: dragLink.at } : null}
        />

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
            const pos = layout.positions.get(id)
            if (!pos) return null
            const pointing = pointersAt(id)
            const watching = focusedBy(id).filter((p) => !pointing.includes(p))
            return (
              <NodeCard
                key={id}
                id={id}
                entry={entry}
                doc={doc}
                tree={tree}
                at={{ x: pos.x + originX, y: pos.y + originY }}
                state={{
                  focused: focusId === id,
                  editing: editingId === id,
                  dragging: drag.carried === id,
                  dropTarget: drag.dropParent === id,
                  linkTarget: Boolean(linkingFrom && linkingFrom !== id),
                  linkSource: linkingFrom === id,
                  placed: Boolean(nodeOverrides[id]),
                  proposed: draftTargets.has(id),
                  quiet: Boolean(editingId || linkingFrom),
                }}
                pointing={pointing}
                watching={watching}
                comments={Object.values(doc.comments).filter((c) => c.targetId === id && !c.resolvedAt)}
                collapsed={collapsed.has(id)}
                spec={toolOf(entry.node.tool)}
                votesOn={votesOn}
                votedByMe={votedByMe}
                dropParent={drag.dropParent}
                register={registerCard}
                on={{
                  pointerDown: (event) => {
                    if (linkingFrom || editingId === id || event.button !== 0) return
                    if ((event.target as HTMLElement).closest('.node-anchor, .node-handle')) return
                    drag.start(id, event, { x: pos.x, y: pos.y }, nodeOverrides[id] ?? null)
                  },
                  click: () => {
                    if (drag.swallowedClick()) return
                    if (linkingFrom) {
                      finishLink(id)
                      return
                    }
                    wantsFocus.current = true
                    setFocus(id)
                  },
                  commitTitle: (title) => {
                    run({ type: 'renameNode', id, title })
                    setEditingId(null)
                  },
                  cancelEdit: () => setEditingId(null),
                  startEdit: () => setEditingId(id),
                  addChild: () => addChild(id),
                  startLink: (event) => {
                    event.stopPropagation()
                    event.preventDefault()
                    const origin = toStage(event.clientX, event.clientY)
                    const start = { fromId: id, origin, at: origin, moved: false }
                    dragRef.current = start
                    setDragLink(start)
                  },
                  vote: (target) => run({ type: 'voteNode', id: target }, 'pointer'),
                  focusNode: (target) => {
                    wantsFocus.current = true
                    setFocus(target)
                  },
                }}
              />
            )
          })}
        </ul>

        {/*
          The board the assistant is offering, drawn where it would land.

          Dashed and unlabelled by any role: it is a picture of a sentence the
          draft panel already says in words ("Siapkan papan retro: 12 simpul"),
          so a screen reader reads the sentence and not a card that is not there
          (D32 uses the same rule for the dashboard thumbnails). It carries no
          `data-node-id`, so nothing can be dropped on it and nothing can focus
          it -- until Terapkan, it is not part of the document at all.
        */}
        {ghost && (
          <GhostCard landing={ghost} at={{ x: ghost.at.x + originX, y: ghost.at.y + originY }} width={NODE_W * 1.4} />
        )}

        {agentPoint && (
          <AgentCursor
            at={agentPoint}
            targetTitle={agentTargetId ? (doc.nodes[agentTargetId]?.title ?? ghost?.title ?? null) : null}
            flipX={agentPoint.x > stageW - 400}
            flipY={agentPoint.y > stageH - 330}
          />
        )}
      </div>
      </div>

    </div>

    {/*
      Outside the scroll container on purpose. Absolutely positioned inside it,
      the zoom bar scrolled away with the board and ended up hundreds of pixels
      off-screen.
    */}
      <ZoomBar zoom={zoom} min={MIN_ZOOM} max={MAX_ZOOM} onZoom={zoomAt} onFit={zoomToFit} />
    </>
  )
}

/** Gentle S-curve. Straight lines cross badly once relations fan out. */
