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
import { useDialogs } from '../../app/DialogContext'
import { useAnnouncer } from '../../a11y/Announcer'
import { useRoom } from '../../app/RoomContext'
import { useTreeKeyboard } from '../../a11y/useTreeKeyboard'
import { layoutFor, NODE_H, NODE_W, sizeOf } from '../../core/shape/layout'
import { toolOf } from '../../core/tools/registry'
import { ToolCard } from './ToolCard'
import { KIND_LABEL, RELATION_LABEL, SHAPE_LABEL, STATE_LABEL } from '../../core/vocabulary'
import { KIND_HUE } from '../../ui/labels'
import { Icon, KindGlyph } from '../../ui/icons'
import { InlineTitle } from '../../ui/InlineTitle'
import { AgentCursor } from '../../features/voice/AgentCursor'
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
  const room = useRoom()
  const onKeyDown = useTreeKeyboard()
  const {
    doc,
    tree,
    canvasIds: visibleIds,
    votedByMe,
    votesOn,
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
    nodeOverrides,
    setNodeOverride,
    panelHidden,
    focusMode,
  } = room
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
    if (keys.length === 0) return computed
    const positions = new Map(computed.positions)
    for (const id of keys) {
      if (positions.has(id)) positions.set(id, nodeOverrides[id])
    }
    let width = 0
    let height = 0
    for (const p of positions.values()) {
      width = Math.max(width, p.x + NODE_W)
      height = Math.max(height, p.y + NODE_H)
    }
    return { positions, width: Math.max(width, computed.width), height: Math.max(height, computed.height) }
  }, [computed, nodeOverrides])

  const BOARD_SLACK = 320

  /*
    The board has a coordinate space, not a corner.

    Auto layout starts at 0,0, and clamping hand placement to that origin meant
    a node could never be moved above or to the left of where the algorithm
    happened to put the first one. If every node has a coordinate, every
    coordinate on the board should be available to it. ORIGIN is how much room
    exists on the negative side of the layout's own origin.
  */
  const ORIGIN = 800

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

  const stageW = layout.width + ORIGIN * 2
  const stageH = layout.height + ORIGIN * 2
  const board = boardSize(zoom, stageW, stageH)
  const sizerW = board.w
  const sizerH = board.h
  const offsetX = (sizerW - stageW * zoom) / 2
  const offsetY = (sizerH - stageH * zoom) / 2

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

      /*
        The canvas runs edge to edge, so the window is not the visible area:
        the top bar, the toolbar, the sidebar, the inspector and the dock all
        float on top of it. Scrolling against the raw viewport parked the
        focused node underneath one of them, half of it showing.

        The insets are measured from those elements rather than derived from the
        layout variables. Deriving meant adding a guess for the toolbar's height,
        and the guess was ten pixels short.
      */
      const box = vp.getBoundingClientRect()
      const pad = measureChrome(box)

      // If the chrome would leave less room than a node needs, showing it
      // somewhere beats refusing to scroll at all.
      if (box.width - pad.left - pad.right < NODE_W * zoom + 80) {
        pad.left = 0
        pad.right = 0
      }
      if (box.height - pad.top - pad.bottom < NODE_H * zoom + 80) {
        pad.top = 0
        pad.bottom = 0
      }

      const { top: padTop, right: padRight, bottom: padBottom, left: padLeft } = pad

      const margin = 24
      const x = offsetX + (p.x + ORIGIN) * zoom
      const y = offsetY + (p.y + ORIGIN) * zoom
      const nodeW = NODE_W * zoom
      const nodeH = NODE_H * zoom
      const left = vp.scrollLeft
      const top = vp.scrollTop
      const viewLeft = left + padLeft + margin
      const viewRight = left + vp.clientWidth - padRight - margin
      const viewTop = top + padTop + margin
      const viewBottom = top + vp.clientHeight - padBottom - margin
      let nextLeft = left
      let nextTop = top

      if (x < viewLeft) nextLeft = Math.max(0, x - padLeft - margin)
      else if (x + nodeW > viewRight) {
        nextLeft = x + nodeW + padRight + margin - vp.clientWidth
      }
      if (y < viewTop) nextTop = Math.max(0, y - padTop - margin)
      else if (y + nodeH > viewBottom) {
        nextTop = y + nodeH + padBottom + margin - vp.clientHeight
      }

      if (Math.abs(nextLeft - left) < 1 && Math.abs(nextTop - top) < 1) return
      const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      vp.scrollTo({ left: nextLeft, top: nextTop, behavior: still || !smooth ? 'auto' : 'smooth' })
    },
    [layout, zoom, inset, offsetX, offsetY],
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
    const onZoomKey = (event: Event) => {
      const key = (event as CustomEvent<string>).detail
      if (key === '0') zoomAt(1)
      else if (key === '-') zoomAt(zoom - 0.15)
      else zoomAt(zoom + 0.15)
    }
    window.addEventListener('kanvas:zoom', onZoomKey)
    return () => window.removeEventListener('kanvas:zoom', onZoomKey)
  }, [zoomAt, zoom])

  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    const observer = new ResizeObserver(() => ensureVisible(focusId, false))
    observer.observe(vp)
    return () => observer.disconnect()
  }, [focusId, ensureVisible])

  /** Put the diagram in the middle of the free space, not the middle of the window. */
  const centreOnContent = useCallback(
    (atZoom: number) => {
      const vp = viewportRef.current
      if (!vp) return
      const freeCentreX = inset.left + (vp.clientWidth - inset.left - inset.right) / 2
      const freeCentreY = inset.top + (vp.clientHeight - inset.top - inset.bottom) / 2
      const stagedW = layout.width + ORIGIN * 2
      const stagedH = layout.height + ORIGIN * 2
      const { w, h } = boardSize(atZoom, stagedW, stagedH)
      // Centre the diagram, not the padding around it.
      vp.scrollLeft = (w - stagedW * atZoom) / 2 + (ORIGIN + layout.width / 2) * atZoom - freeCentreX
      vp.scrollTop = (h - stagedH * atZoom) / 2 + (ORIGIN + layout.height / 2) * atZoom - freeCentreY
    },
    [inset, layout, boardSize],
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
    const p = layout.positions.get(id)
    if (!p) return null
    const size = sizeOf(tree, id)
    return { x: p.x + ORIGIN + size.w / 2, y: p.y + ORIGIN + size.h / 2 }
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
  const agentAnchor = agentTargetId ? layout.positions.get(agentTargetId) : undefined
  const agentPoint = agentAnchor
    ? { x: agentAnchor.x + ORIGIN + NODE_W - 18, y: agentAnchor.y + ORIGIN + NODE_H - 10 }
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
          const dx = (event.clientX - node.startX) / zoom
          const dy = (event.clientY - node.startY) / zoom
          if (!suppressClickRef.current && Math.hypot(dx, dy) < 4) return
          suppressClickRef.current = true
          setDraggingNode(node.id)
          // Bounded by the board, not by the layout's origin.
          const limit = (value: number, extent: number) =>
            Math.min(extent + ORIGIN - NODE_W, Math.max(-ORIGIN + 12, value))
          setNodeOverride(node.id, {
            x: limit(node.from.x + dx, layout.width),
            y: limit(node.from.y + dy, layout.height),
          })
          const over = parentUnder(event.clientX, event.clientY, node.id)
          if (over !== dropRef.current) {
            dropRef.current = over
            setDropParent(over)
          }
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
        <svg className="canvas-edges" width={stageW} height={stageH} aria-hidden="true" focusable="false">
          <defs>
            <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="currentColor" />
            </marker>
          </defs>
          {parentEdges.map((e) => (
            <path key={e.id} className="edge edge-parent" d={curve(e.from, e.to)} />
          ))}
          {dragLink?.moved && (
            <path
              className="edge edge-drawing"
              d={curve(dragLink.origin, dragLink.at)}
              markerEnd="url(#arrow)"
            />
          )}
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
            const spec = toolOf(node.tool)
            const size = sizeOf(tree, id)

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
                data-node-id={id}
                tabIndex={focusId === id ? 0 : -1}
                className={`node node-${node.kind} ${focusId === id ? 'is-focus' : ''} ${
                  pointing.length ? 'is-pointed' : ''
                } ${draftTargets.has(id) ? 'is-proposed' : ''} ${
                  linkingFrom && linkingFrom !== id ? 'is-linktarget' : ''
                } ${linkingFrom === id ? 'is-linksource' : ''} ${
                  draggingNode === id ? 'is-dragging' : ''
                } ${dropParent === id ? 'is-droptarget' : ''} ${
                  nodeOverrides[id] ? 'is-placed' : ''
                } ${spec ? `node-tool tool-${spec.id}` : ''}`}
                style={{
                  transform: `translate(${pos.x + ORIGIN}px, ${pos.y + ORIGIN}px)`,
                  // Width is fixed by kind; height belongs to the content, and
                  // the layout finds out what it was by measuring afterwards.
                  width: size.w,
                  minHeight: NODE_H,
                  ['--kh' as string]: String(hue),
                }}
                ref={(el) => {
                  if (el) refs.current.set(id, el)
                  else refs.current.delete(id)
                }}
                onPointerDown={(event) => {
                  if (linkingFrom || editingId === id || event.button !== 0) return
                  if ((event.target as HTMLElement).closest('.node-anchor, .node-handle')) return
                  nodeDragRef.current = {
                    id,
                    startX: event.clientX,
                    startY: event.clientY,
                    from: { x: pos.x, y: pos.y },
                    hadPlacement: nodeOverrides[id] ?? null,
                  }
                }}
                onClick={() => {
                  if (suppressClickRef.current) return
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
                  {spec ? (
                    <>
                      <Icon name={spec.icon} size={12} />
                      {spec.label}
                    </>
                  ) : (
                    <>
                      <KindGlyph kind={node.kind} />
                      {KIND_LABEL[node.kind]}
                    </>
                  )}
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
                {spec && (
                  <ToolCard
                    spec={spec}
                    id={id}
                    doc={doc}
                    tree={tree}
                    votesOn={votesOn}
                    votedByMe={votedByMe}
                    dropParent={dropParent}
                    onVote={(target) => run({ type: 'voteNode', id: target }, 'pointer')}
                    onFocus={(target) => {
                      wantsFocus.current = true
                      setFocus(target)
                    }}
                  />
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

                {!editingId && !linkingFrom && (
                  <>
                    {focusId === id && (
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
                      </span>
                    )}

                    {/*
                      Pointer affordance only, so it adds no tab stops. The
                      accessible route to the same command is `r` and the Hubung
                      button, which were there first.
                    */}
                    {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
                      <span
                        key={side}
                        className={`node-anchor anchor-${side}`}
                        aria-hidden="true"
                        onPointerDown={(event) => {
                          event.stopPropagation()
                          event.preventDefault()
                          const origin = toStage(event.clientX, event.clientY)
                          const start = { fromId: id, origin, at: origin, moved: false }
                          dragRef.current = start
                          setDragLink(start)
                        }}
                      />
                    ))}
                  </>
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
