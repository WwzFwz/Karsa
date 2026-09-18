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
import { Icon } from '../shared/icons'
import { AgentCursor } from '../voice/AgentCursor'
import { Edges, type Edge, type LabelledEdge } from './Edges'
import { GhostCard } from './GhostCard'
import { NodeCard } from './NodeCard'
import { useFocusInView } from './useFocusInView'
import { descendantsOf } from '../../core/tree/project'
import type { NodeId } from '../../core/model/types'
import type { Point } from '../../core/shape/layout'

const BREATH = 28

/**
 * How much of the viewport each floating panel covers.
 *
 * Every panel is anchored to an edge, so the edge it is nearest to is the one
 * it occludes. Guessing from width and height instead needed thresholds, and
 * the thresholds missed the inspector on a narrow window -- too narrow to count
 * as a band, too short to count as a column, so it was ignored entirely and
 * nodes kept sliding underneath it.
 */
function measureChrome(box: DOMRect): { top: number; right: number; bottom: number; left: number } {
  const pad = { top: 0, right: 0, bottom: 0, left: 0 }
  for (const selector of ['.topbar', '.canvas-toolbar', '.sidebar', '.inspector', '.dock', '.zoom-bar']) {
    const el = document.querySelector(selector)
    if (!el) continue
    const r = el.getBoundingClientRect()
    if (r.width <= 0 || r.height <= 0) continue
    const distance = {
      top: r.top - box.top,
      right: box.right - r.right,
      bottom: box.bottom - r.bottom,
      left: r.left - box.left,
    }
    const side = (Object.keys(distance) as (keyof typeof distance)[]).reduce((best, key) =>
      distance[key] < distance[best] ? key : best,
    )
    if (side === 'top') pad.top = Math.max(pad.top, r.bottom - box.top)
    else if (side === 'bottom') pad.bottom = Math.max(pad.bottom, box.bottom - r.top)
    else if (side === 'left') pad.left = Math.max(pad.left, r.right - box.left)
    else pad.right = Math.max(pad.right, box.right - r.left)
  }
  return pad
}

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
  */
  const panRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  const [panning, setPanning] = useState(false)

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
  const [inset, setInset] = useState({ top: 96, right: 32, bottom: 96, left: 32 })
  const [viewBox, setViewBox] = useState({ w: 1000, h: 700 })

  const [zoom, setZoom] = useState(1)
  const MIN_ZOOM = 0.25
  const MAX_ZOOM = 2

  const measure = useCallback(() => {
    const vp = viewportRef.current
    if (!vp) return
    const box = vp.getBoundingClientRect()
    setViewBox((prev) =>
      Math.abs(prev.w - box.width) < 2 && Math.abs(prev.h - box.height) < 2
        ? prev
        : { w: box.width, h: box.height },
    )
    const chrome = measureChrome(box)
    setInset((prev) => {
      const next = {
        top: chrome.top + BREATH,
        right: chrome.right + BREATH,
        bottom: chrome.bottom + BREATH,
        left: chrome.left + BREATH,
      }
      const same =
        Math.abs(prev.top - next.top) < 2 &&
        Math.abs(prev.right - next.right) < 2 &&
        Math.abs(prev.bottom - next.bottom) < 2 &&
        Math.abs(prev.left - next.left) < 2
      return same ? prev : next
    })
  }, [])

  useLayoutEffect(() => {
    measure()
    const vp = viewportRef.current
    if (!vp) return
    const observer = new ResizeObserver(measure)
    observer.observe(vp)
    for (const selector of ['.topbar', '.canvas-toolbar', '.sidebar', '.inspector', '.dock']) {
      const el = document.querySelector(selector)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [measure, panelHidden, focusMode])

  /*
    A board wider than the window, with the diagram centred in it.

    The earlier version reserved a gutter the size of the chrome and then a
    margin the size of the viewport. Both were wrong in the same way: they were
    dead zones the diagram could not enter, and at low zoom they pushed
    everything into a corner. A board that is simply larger than the window,
    with the content in the middle, does the job without any of that.
  */

  const toStage = useCallback(
    (clientX: number, clientY: number): Point => {
      const rect = stageRef.current?.getBoundingClientRect()
      // The stage is scaled, so screen pixels are not stage pixels.
      return { x: (clientX - (rect?.left ?? 0)) / zoom, y: (clientY - (rect?.top ?? 0)) / zoom }
    },
    [zoom],
  )

  /** Zoom about a screen point, so the thing under the cursor stays put. */
  const zoomAt = useCallback(
    (next: number, clientX?: number, clientY?: number) => {
      const vp = viewportRef.current
      const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next))
      if (!vp) {
        setZoom(clamped)
        return
      }
      const box = vp.getBoundingClientRect()
      const anchorX = (clientX ?? box.left + box.width / 2) - box.left
      const anchorY = (clientY ?? box.top + box.height / 2) - box.top
      const stageX = (vp.scrollLeft + anchorX) / zoom
      const stageY = (vp.scrollTop + anchorY) / zoom
      setZoom(clamped)
      requestAnimationFrame(() => {
        vp.scrollLeft = stageX * clamped - anchorX
        vp.scrollTop = stageY * clamped - anchorY
      })
    },
    [zoom],
  )

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

  const BOARD_SLACK = 320

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
    The board is always larger than the window by at least the chrome it hides
    behind.

    Sizing it to `max(window, content)` looked right and was the bug: when the
    diagram fitted, scrollWidth equalled clientWidth, the scroll range was zero,
    and any node sitting under the inspector could never be pulled out from
    under it. Scroll range has to exist precisely where a panel covers the
    canvas, or that strip of board is unreachable.
  */
  const boardSize = useCallback(
    (atZoom: number, contentW: number, contentH: number) => ({
      w: Math.max(viewBox.w + inset.left + inset.right, contentW * atZoom + BOARD_SLACK * 2),
      h: Math.max(viewBox.h + inset.top + inset.bottom, contentH * atZoom + BOARD_SLACK * 2),
    }),
    [viewBox, inset],
  )

  const stageW = layout.width + originX + ORIGIN
  const stageH = layout.height + originY + ORIGIN
  const board = boardSize(zoom, stageW, stageH)
  const sizerW = board.w
  const sizerH = board.h
  const offsetX = (sizerW - stageW * zoom) / 2
  const offsetY = (sizerH - stageH * zoom) / 2

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
    const drag = nodeDragRef.current
    if (drag) {
      drag.startLeft += dx
      drag.startTop += dy
    }
  }, [originX, originY, stageOriginX, stageOriginY])

  /*
    Dragging a node moves it on this screen only. Nothing is dispatched, no
    event is written, nothing crosses the wire -- so it cannot carry meaning to
    anyone else, which is exactly why it stays inside rule 2. The structural
    move, the one that does mean something, is still `m`.
  */
  const nodeDragRef = useRef<{
    id: NodeId
    startX: number
    startY: number
    /*
      Where the board was scrolled to when the node was picked up, and where the
      pointer is now. Both exist for the same reason: the board may scroll under
      a drag (see the edge pull below), and a node placed from the pointer's
      screen delta alone would slide out from under the finger by exactly the
      distance scrolled. The placement is computed in board space instead.
    */
    startLeft: number
    startTop: number
    pointerX: number
    pointerY: number
    from: Point
    /** What the node's placement was before the drag, so a cancel can restore it. */
    hadPlacement: Point | null
  } | null>(null)
  const suppressClickRef = useRef(false)
  const [draggingNode, setDraggingNode] = useState<NodeId | null>(null)
  /*
    Dropping a node on another node reparents it -- the assembly gesture from
    FigJam and draw.io, where you move a thing by putting it where it belongs
    rather than by naming its new parent in a list. It is an addition, not a
    replacement: `m` and the command list still open the picker, so rule D6
    holds -- no operation is drag-only.

    The drop still goes through the confirmation gate, because a reparent is
    structural and rule 8 puts moves behind one.
  */
  const [dropParent, setDropParent] = useState<NodeId | null>(null)
  const dropRef = useRef<NodeId | null>(null)

  /** The node under the pointer that this one is allowed to land inside. */
  const parentUnder = useCallback(
    (clientX: number, clientY: number, dragged: NodeId): NodeId | null => {
      const forbidden = new Set<NodeId>([dragged, ...descendantsOf(tree, dragged)])
      const stack = document.elementsFromPoint(clientX, clientY)
      for (const el of stack) {
        const id = el.closest('[data-node-id]')?.getAttribute('data-node-id')
        if (!id) continue
        if (forbidden.has(id)) return null
        return doc.nodes[dragged]?.parentId === id ? null : id
      }
      return null
    },
    [tree, doc],
  )

  /** Put the dragged node where the pointer is, in board space. */
  const placeDragged = useCallback(() => {
    const drag = nodeDragRef.current
    const vp = viewportRef.current
    if (!drag || !vp) return
    const dx = (drag.pointerX - drag.startX + vp.scrollLeft - drag.startLeft) / zoom
    const dy = (drag.pointerY - drag.startY + vp.scrollTop - drag.startTop) / zoom
    /*
      Bounded by the board, not by the layout's origin -- and the board keeps
      ORIGIN of clear ground past the furthest thing on it in every direction.
      Going right and down `extent` already grows with the node; going left and
      up `origin` now does the same, so neither end is a wall somebody can be
      stopped by while still carrying something.
    */
    const limit = (value: number, extent: number, origin: number) =>
      Math.min(extent + ORIGIN - NODE_W, Math.max(-origin + 12, value))
    setNodeOverride(drag.id, {
      x: limit(drag.from.x + dx, layout.width, originX),
      y: limit(drag.from.y + dy, layout.height, originY),
    })
    const over = parentUnder(drag.pointerX, drag.pointerY, drag.id)
    if (over !== dropRef.current) {
      dropRef.current = over
      setDropParent(over)
    }
  }, [zoom, layout.width, layout.height, originX, originY, setNodeOverride, parentUnder])

  /*
    Carrying a node to the edge pulls the board along, the way every board tool
    does it.

    Without this the only way to reach somewhere off-screen was to drop the node,
    pan, and pick it up again -- and the reparent gesture (D34) is worth nothing
    if the intended parent cannot be reached while holding the child.

    The speed ramps with depth into the zone rather than switching on, so easing
    up to the rim slows the board down instead of stopping it dead. The zone is
    measured inside the floating chrome (D30): the rim that matters is where the
    board stops being visible, not where the window ends.
  */
  const EDGE_ZONE = 72
  const EDGE_SPEED = 22
  const edgePullRef = useRef<number | null>(null)
  /* Read imperatively from the frame loop: `placeDragged` changes identity on
     every frame of a drag, and a loop that restarted with it would be the very
     bug this file already learned once (D74, D77). */
  const placeRef = useRef(placeDragged)
  placeRef.current = placeDragged

  const stopEdgePull = useCallback(() => {
    if (edgePullRef.current === null) return
    cancelAnimationFrame(edgePullRef.current)
    edgePullRef.current = null
  }, [])

  const edgePull = useCallback(() => {
    edgePullRef.current = null
    const drag = nodeDragRef.current
    const vp = viewportRef.current
    if (!drag || !vp) return
    const box = vp.getBoundingClientRect()
    const pad = measureChrome(box)
    // Zero at the inner lip of the zone, full speed at the rim and beyond it.
    const pull = (gap: number) => (gap >= EDGE_ZONE ? 0 : EDGE_SPEED * (1 - Math.max(0, gap) / EDGE_ZONE))
    const dx =
      pull(box.right - pad.right - drag.pointerX) - pull(drag.pointerX - (box.left + pad.left))
    const dy =
      pull(box.bottom - pad.bottom - drag.pointerY) - pull(drag.pointerY - (box.top + pad.top))
    if (dx || dy) {
      const was = { left: vp.scrollLeft, top: vp.scrollTop }
      vp.scrollLeft += dx
      vp.scrollTop += dy
      // Only when the board actually moved: at the end of the scroll range it
      // does not, and re-placing then would drift the node away from the pointer.
      if (vp.scrollLeft !== was.left || vp.scrollTop !== was.top) placeRef.current()
    }
    edgePullRef.current = requestAnimationFrame(edgePull)
  }, [])

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
    dragging: () => nodeDragRef.current !== null,
  })

  useEffect(() => {
    const onZoomKey = (event: Event) => {
      const key = (event as CustomEvent<string>).detail
      if (key === '0') zoomAt(1)
      else if (key === '-') zoomAt(zoom - 0.15)
      else zoomAt(zoom + 0.15)
    }
    window.addEventListener('kanvas:zoom', onZoomKey)
    return () => window.removeEventListener('kanvas:zoom', onZoomKey)
  }, [zoomAt, zoom])

  /** Put the diagram in the middle of the free space, not the middle of the window. */
  const centreOnContent = useCallback(
    (atZoom: number) => {
      const vp = viewportRef.current
      if (!vp) return
      const freeCentreX = inset.left + (vp.clientWidth - inset.left - inset.right) / 2
      const freeCentreY = inset.top + (vp.clientHeight - inset.top - inset.bottom) / 2
      const stagedW = layout.width + originX + ORIGIN
      const stagedH = layout.height + originY + ORIGIN
      const { w, h } = boardSize(atZoom, stagedW, stagedH)
      // Centre the diagram, not the padding around it. The diagram now starts
      // at `minX`, not at zero, so its middle has to be read from both ends.
      const midX = originX + (layout.minX + layout.width) / 2
      const midY = originY + (layout.minY + layout.height) / 2
      vp.scrollLeft = (w - stagedW * atZoom) / 2 + midX * atZoom - freeCentreX
      vp.scrollTop = (h - stagedH * atZoom) / 2 + midY * atZoom - freeCentreY
    },
    [inset, layout, boardSize, originX, originY],
  )

  /** Shrink until the whole diagram fits the space the chrome leaves free. */
  const zoomToFit = useCallback(() => {
    const vp = viewportRef.current
    if (!vp) return
    // Fit against the window, not against what the chrome leaves: subtracting
    // the panels shrank the diagram to a third of the screen for no good reason.
    const usableW = Math.max(240, vp.clientWidth - 160)
    const usableH = Math.max(240, vp.clientHeight - 200)
    const next = Math.max(MIN_ZOOM, Math.min(1, usableW / layout.width, usableH / layout.height))
    // Fit is for seeing the whole shape, and the button is always there for
    // that. Opening at it is different: below about two thirds the titles stop
    // being readable, and an unreadable overview is worse than a readable
    // fragment you can pan.
    setZoom(next)
    requestAnimationFrame(() => centreOnContent(next))
  }, [layout, inset, centreOnContent])

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
  const didFit = useRef(false)
  useEffect(() => {
    if (didFit.current) return
    const vp = viewportRef.current
    if (!vp || vp.clientWidth === 0) return
    didFit.current = true
    const overflows =
      layout.width > vp.clientWidth - inset.left - inset.right ||
      layout.height > vp.clientHeight - inset.top - inset.bottom
    window.setTimeout(() => {
      if (!overflows) {
        centreOnContent(zoom)
        return
      }
      const usableW = Math.max(240, vp.clientWidth - 160)
      const usableH = Math.max(240, vp.clientHeight - 200)
      const fitted = Math.min(1, usableW / layout.width, usableH / layout.height)
      const opening = Math.max(0.65, fitted)
      setZoom(opening)
      requestAnimationFrame(() => centreOnContent(opening))
    }, 140)
  }, [stageW, stageH, inset, layout, centreOnContent, zoom])


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
        panRef.current = { x: event.clientX, y: event.clientY, left: vp.scrollLeft, top: vp.scrollTop }
        setPanning(true)
        vp.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
        const node = nodeDragRef.current
        if (node) {
          if (
            !suppressClickRef.current &&
            Math.hypot(event.clientX - node.startX, event.clientY - node.startY) < 4 * zoom
          ) {
            return
          }
          const starting = !suppressClickRef.current
          suppressClickRef.current = true
          node.pointerX = event.clientX
          node.pointerY = event.clientY
          setDraggingNode(node.id)
          placeDragged()
          // The board only follows a node that is actually being carried, so the
          // pull starts here rather than at pointerdown.
          if (starting) edgePullRef.current = requestAnimationFrame(edgePull)
          return
        }
        const start = panRef.current
        const vp = viewportRef.current
        if (!start || !vp) return
        vp.scrollLeft = start.left - (event.clientX - start.x)
        vp.scrollTop = start.top - (event.clientY - start.y)
      }}
      onPointerUp={(event) => {
        const dragged = nodeDragRef.current
        if (dragged) {
          stopEdgePull()
          const parent = dropRef.current
          dropRef.current = null
          setDropParent(null)
          nodeDragRef.current = null
          setDraggingNode(null)
          if (parent) {
            // Put it back exactly as it was picked up -- including having no
            // placement at all. If the move is confirmed the layout puts the
            // node under its new parent; if it is not, nothing has changed.
            setNodeOverride(dragged.id, dragged.hadPlacement)
            dialogs.open({ kind: 'move', nodeId: dragged.id, presetParent: parent })
          }
          // The click that follows a drag would re-focus; that is harmless, but
          // it must not be read as a plain selection gesture.
          window.setTimeout(() => {
            suppressClickRef.current = false
          }, 0)
        }
        if (!panRef.current) return
        panRef.current = null
        setPanning(false)
        viewportRef.current?.releasePointerCapture(event.pointerId)
      }}
      onPointerCancel={() => {
        stopEdgePull()
        if (nodeDragRef.current) {
          // A cancelled carry is not a drop: put the node back where it was.
          setNodeOverride(nodeDragRef.current.id, nodeDragRef.current.hadPlacement)
          nodeDragRef.current = null
          setDraggingNode(null)
          dropRef.current = null
          setDropParent(null)
        }
        panRef.current = null
        setPanning(false)
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
                  dragging: draggingNode === id,
                  dropTarget: dropParent === id,
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
                dropParent={dropParent}
                on={{
                  pointerDown: (event) => {
                    if (linkingFrom || editingId === id || event.button !== 0) return
                    if ((event.target as HTMLElement).closest('.node-anchor, .node-handle')) return
                    nodeDragRef.current = {
                      id,
                      startX: event.clientX,
                      startY: event.clientY,
                      startLeft: viewportRef.current?.scrollLeft ?? 0,
                      startTop: viewportRef.current?.scrollTop ?? 0,
                      pointerX: event.clientX,
                      pointerY: event.clientY,
                      from: { x: pos.x, y: pos.y },
                      hadPlacement: nodeOverrides[id] ?? null,
                    }
                  },
                  click: () => {
                    if (suppressClickRef.current) return
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
      <div className="zoom-bar" role="group" aria-label="Perbesaran kanvas">
        <button
          type="button"
          className="icon-btn"
          aria-label="Perkecil"
          title="Perkecil (Ctrl -)"
          onClick={() => zoomAt(zoom - 0.15)}
          disabled={zoom <= MIN_ZOOM + 0.001}
        >
          <Icon name="minus" size={17} />
        </button>
        <button
          type="button"
          className="zoom-value"
          aria-label={`Perbesaran ${Math.round(zoom * 100)} persen. Kembalikan ke ukuran asli.`}
          title="Kembali ke 100 persen (Ctrl 0)"
          onClick={() => zoomAt(1)}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label="Perbesar"
          title="Perbesar (Ctrl +)"
          onClick={() => zoomAt(zoom + 0.15)}
          disabled={zoom >= MAX_ZOOM - 0.001}
        >
          <Icon name="plus" size={17} />
        </button>
        <span className="dock-sep" aria-hidden="true" />
        <button
          type="button"
          className="icon-btn"
          aria-label="Paskan seluruh kanvas ke layar"
          title="Paskan ke layar"
          onClick={zoomToFit}
        >
          <Icon name="maximize" size={17} />
        </button>
      </div>
    </>
  )
}

/** Gentle S-curve. Straight lines cross badly once relations fan out. */
