/**
 * Carrying a card with the hand.
 *
 * Two things happen at once and they are easy to confuse. Moving a card on this
 * screen is a **device-local opinion about where it sits** -- nothing is
 * dispatched, no event is written, nothing crosses the wire, which is exactly
 * why it stays inside rule 2 (D31). Dropping it onto another card is a
 * **proposal to change the tree**, and that goes through the confirmation gate
 * like every other structural move (rule 8, D34).
 *
 * Neither is the only way to reach anything: `m` and the command list open the
 * picker, so D6 holds and a person who cannot hold a pointer down loses
 * nothing.
 */

import { useCallback, useRef, useState } from 'react'
import { descendantsOf } from '../../core/tree/project'
import { measureChrome } from './viewport'
import type { NodeId, RoomDoc } from '../../core/model/types'
import type { Point } from '../../core/shape/layout'
import type { TreeProjection } from '../../core/tree/project'

/** How far the pointer must travel before a click becomes a carry. */
const THRESHOLD = 4

/*
  Carrying a node to the edge pulls the board along, the way every board tool
  does it.

  Without this the only way to reach somewhere off-screen was to drop the node,
  pan, and pick it up again -- and the reparent gesture is worth nothing if the
  intended parent cannot be reached while holding the child.

  The speed ramps with depth into the zone rather than switching on, so easing
  up to the rim slows the board down instead of stopping it dead. The zone is
  measured inside the floating chrome (D30): the rim that matters is where the
  board stops being visible, not where the window ends.
*/
const EDGE_ZONE = 72
const EDGE_SPEED = 22

interface Carry {
  id: NodeId
  startX: number
  startY: number
  /*
    Where the board was scrolled to when the node was picked up, and where the
    pointer is now. Both exist for the same reason: the board may scroll under a
    drag, and a node placed from the pointer's screen delta alone would slide
    out from under the finger by exactly the distance scrolled. The placement is
    computed in board space instead.
  */
  startLeft: number
  startTop: number
  pointerX: number
  pointerY: number
  from: Point
  /** What the node's placement was before the drag, so a cancel can restore it. */
  hadPlacement: Point | null
}

export interface NodeDrag {
  /** The card being carried right now, for the class that lifts it. */
  carried: NodeId | null
  /** The card it would land inside, marked while the pointer is over it. */
  dropParent: NodeId | null
  isCarrying: () => boolean
  /** True for one tick after a carry, so the click that follows is not a selection. */
  swallowedClick: () => boolean
  start: (id: NodeId, at: { clientX: number; clientY: number }, from: Point, hadPlacement: Point | null) => void
  /** Returns true when it took the event, so panning knows to stay out of it. */
  move: (at: { clientX: number; clientY: number }) => boolean
  finish: () => void
  cancel: () => void
  /**
   * The board moved under the carry without the pointer moving.
   *
   * Growing the board leftwards shifts every coordinate, and a carry measured
   * from the scroll position it started at would lurch away from the hand
   * holding it by exactly that much (D84).
   */
  shiftBy: (dx: number, dy: number) => void
}

export function useNodeDrag({
  viewportRef,
  zoom,
  doc,
  tree,
  /** The board's coordinate origin, per axis, as the layout currently stands. */
  origin,
  /** How far the content reaches, so a carry cannot leave the board entirely. */
  extent,
  /** Clear board kept past the furthest thing on it, in every direction (D84). */
  slack,
  nodeWidth,
  setNodeOverride,
  /** A card was dropped onto another: propose the move, do not perform it. */
  onDropOnto,
}: {
  viewportRef: { current: HTMLDivElement | null }
  zoom: number
  doc: RoomDoc
  tree: TreeProjection
  origin: Point
  extent: { w: number; h: number }
  slack: number
  nodeWidth: number
  setNodeOverride: (id: NodeId, at: Point | null) => void
  onDropOnto: (id: NodeId, parentId: NodeId, hadPlacement: Point | null) => void
}): NodeDrag {
  const carry = useRef<Carry | null>(null)
  const suppressClick = useRef(false)
  const [carried, setCarried] = useState<NodeId | null>(null)
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

  /** Put the carried node where the pointer is, in board space. */
  const place = useCallback(() => {
    const drag = carry.current
    const vp = viewportRef.current
    if (!drag || !vp) return
    const dx = (drag.pointerX - drag.startX + vp.scrollLeft - drag.startLeft) / zoom
    const dy = (drag.pointerY - drag.startY + vp.scrollTop - drag.startTop) / zoom
    /*
      Bounded by the board, not by the layout's origin -- and the board keeps
      `slack` of clear ground past the furthest thing on it in every direction.
      Going right and down `extent` already grows with the node; going left and
      up `origin` now does the same, so neither end is a wall somebody can be
      stopped by while still carrying something.
    */
    const limit = (value: number, reach: number, from: number) =>
      Math.min(reach + slack - nodeWidth, Math.max(-from + 12, value))
    setNodeOverride(drag.id, {
      x: limit(drag.from.x + dx, extent.w, origin.x),
      y: limit(drag.from.y + dy, extent.h, origin.y),
    })
    const over = parentUnder(drag.pointerX, drag.pointerY, drag.id)
    if (over !== dropRef.current) {
      dropRef.current = over
      setDropParent(over)
    }
  }, [viewportRef, zoom, extent.w, extent.h, origin.x, origin.y, slack, nodeWidth, setNodeOverride, parentUnder])

  /*
    Read imperatively from the frame loop: `place` changes identity on every
    frame of a carry, and a loop that restarted with it would be the very bug
    this folder has learned three times (D74, D77, D84).
  */
  const placeRef = useRef(place)
  placeRef.current = place

  const pullRef = useRef<number | null>(null)

  const stopPull = useCallback(() => {
    if (pullRef.current === null) return
    cancelAnimationFrame(pullRef.current)
    pullRef.current = null
  }, [])

  const pull = useCallback(() => {
    pullRef.current = null
    const drag = carry.current
    const vp = viewportRef.current
    if (!drag || !vp) return
    const box = vp.getBoundingClientRect()
    const pad = measureChrome(box)
    // Zero at the inner lip of the zone, full speed at the rim and beyond it.
    const speed = (gap: number) => (gap >= EDGE_ZONE ? 0 : EDGE_SPEED * (1 - Math.max(0, gap) / EDGE_ZONE))
    const dx = speed(box.right - pad.right - drag.pointerX) - speed(drag.pointerX - (box.left + pad.left))
    const dy = speed(box.bottom - pad.bottom - drag.pointerY) - speed(drag.pointerY - (box.top + pad.top))
    if (dx || dy) {
      const was = { left: vp.scrollLeft, top: vp.scrollTop }
      vp.scrollLeft += dx
      vp.scrollTop += dy
      // Only when the board actually moved: at the end of the scroll range it
      // does not, and re-placing then would drift the node away from the pointer.
      if (vp.scrollLeft !== was.left || vp.scrollTop !== was.top) placeRef.current()
    }
    pullRef.current = requestAnimationFrame(pull)
  }, [viewportRef])

  const start = useCallback<NodeDrag['start']>((id, at, from, hadPlacement) => {
    carry.current = {
      id,
      startX: at.clientX,
      startY: at.clientY,
      startLeft: viewportRef.current?.scrollLeft ?? 0,
      startTop: viewportRef.current?.scrollTop ?? 0,
      pointerX: at.clientX,
      pointerY: at.clientY,
      from,
      hadPlacement,
    }
  }, [viewportRef])

  const move = useCallback<NodeDrag['move']>(
    (at) => {
      const drag = carry.current
      if (!drag) return false
      // A short wobble is a click, not a carry.
      if (!suppressClick.current && Math.hypot(at.clientX - drag.startX, at.clientY - drag.startY) < THRESHOLD * zoom) {
        return true
      }
      const starting = !suppressClick.current
      suppressClick.current = true
      drag.pointerX = at.clientX
      drag.pointerY = at.clientY
      setCarried(drag.id)
      placeRef.current()
      // The board only follows a node that is actually being carried, so the
      // pull starts here rather than when the pointer went down.
      if (starting) pullRef.current = requestAnimationFrame(pull)
      return true
    },
    [zoom, pull],
  )

  const finish = useCallback<NodeDrag['finish']>(() => {
    const drag = carry.current
    if (!drag) return
    stopPull()
    const parent = dropRef.current
    dropRef.current = null
    setDropParent(null)
    carry.current = null
    setCarried(null)
    if (parent) {
      // Put it back exactly as it was picked up -- including having no
      // placement at all. If the move is confirmed the layout puts the node
      // under its new parent; if it is not, nothing has changed.
      setNodeOverride(drag.id, drag.hadPlacement)
      onDropOnto(drag.id, parent, drag.hadPlacement)
    }
    // The click that follows a drag would re-focus; that is harmless, but it
    // must not be read as a plain selection gesture.
    window.setTimeout(() => {
      suppressClick.current = false
    }, 0)
  }, [stopPull, setNodeOverride, onDropOnto])

  const cancel = useCallback<NodeDrag['cancel']>(() => {
    stopPull()
    const drag = carry.current
    if (!drag) return
    // A cancelled carry is not a drop: put the node back where it was.
    setNodeOverride(drag.id, drag.hadPlacement)
    carry.current = null
    setCarried(null)
    dropRef.current = null
    setDropParent(null)
  }, [stopPull, setNodeOverride])

  const shiftBy = useCallback<NodeDrag['shiftBy']>((dx, dy) => {
    const drag = carry.current
    if (!drag) return
    drag.startLeft += dx
    drag.startTop += dy
  }, [])

  return {
    carried,
    dropParent,
    shiftBy,
    isCarrying: () => carry.current !== null,
    swallowedClick: () => suppressClick.current,
    start,
    move,
    finish,
    cancel,
  }
}
