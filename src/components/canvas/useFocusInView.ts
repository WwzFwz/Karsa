/**
 * Keeps the focused node where it can be seen (D19, D30).
 *
 * Without this the canvas opens on whatever happens to be at scroll zero -- for
 * a mind map that is the top edge, not the root -- and arrowing through a large
 * tree walks the focus ring straight off the screen. It exists for people
 * navigating by keyboard, which is why it is not decoration.
 *
 * The arithmetic is not here; it is `scrollToShow` in `viewport.ts`, where it
 * can be tested without a browser. What lives here is the part that genuinely
 * needs React: when to run, and what to read at that moment.
 */

import { useEffect, useRef } from 'react'
import { measureChrome, scrollToShow } from './viewport'
import type { Point } from '../../core/shape/layout'
import type { NodeId } from '../../core/model/types'

export function useFocusInView({
  focusId,
  viewportRef,
  positionOf,
  nodeSize,
  origin,
  offset,
  zoom,
  /** True while a node is being carried by hand, when this must keep out of it. */
  dragging,
}: {
  focusId: NodeId | null
  viewportRef: { current: HTMLDivElement | null }
  positionOf: (id: NodeId) => Point | undefined
  nodeSize: { w: number; h: number }
  origin: Point
  offset: Point
  zoom: number
  dragging: () => boolean
}): void {
  /*
    Everything the scroll reads goes through one "latest value" ref, so the
    effect below restarts when the focus moves and at no other time.

    Depending on these directly is the trap this file has fallen into twice
    (D74, D77) and once more in D84: `positionOf` is rebuilt whenever the
    layout is, and the layout is rebuilt on every frame of a hand placement. The
    effect was torn down and re-scheduled sixty times a second while a node was
    being dragged, each pass cancelling the smooth scroll the pass before it had
    started. Measured then: twenty pointer moves, twenty scrolls scheduled and
    cancelled, forty timers.
  */
  const latest = useRef({ viewportRef, positionOf, nodeSize, origin, offset, zoom, dragging })
  latest.current = { viewportRef, positionOf, nodeSize, origin, offset, zoom, dragging }

  const show = useRef((id: NodeId | null, smooth: boolean) => {
    const it = latest.current
    const vp = it.viewportRef.current
    if (!vp || !id) return
    /*
      Never while a node is being carried. A hand on a card already says where
      the attention is, and the edge pull is what moves the board then. Left in,
      it fought the pointer for the board on every frame.
    */
    if (it.dragging()) return
    const p = it.positionOf(id)
    if (!p) return

    const box = vp.getBoundingClientRect()
    const target = scrollToShow(
      {
        x: it.offset.x + (p.x + it.origin.x) * it.zoom,
        y: it.offset.y + (p.y + it.origin.y) * it.zoom,
        w: it.nodeSize.w * it.zoom,
        h: it.nodeSize.h * it.zoom,
      },
      {
        width: box.width,
        height: box.height,
        clientWidth: vp.clientWidth,
        clientHeight: vp.clientHeight,
        scrollLeft: vp.scrollLeft,
        scrollTop: vp.scrollTop,
      },
      measureChrome(box),
    )
    if (!target) return
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    vp.scrollTo({ ...target, behavior: still || !smooth ? 'auto' : 'smooth' })
  })

  useEffect(() => {
    // One pass next frame, then two more as the stylesheet and the dock settle.
    // Measuring once is not enough: on a cold load the viewport briefly reports
    // its unconstrained height, which makes every node look already visible.
    const frame = requestAnimationFrame(() => show.current(focusId, true))
    const late = [220, 600].map((delay) => window.setTimeout(() => show.current(focusId, false), delay))
    return () => {
      cancelAnimationFrame(frame)
      late.forEach((id) => window.clearTimeout(id))
    }
  }, [focusId])

  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    // Resizing the window, or opening a panel, can cover a node that was clear.
    const observer = new ResizeObserver(() => show.current(focusId, false))
    observer.observe(vp)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- viewportRef is stable
  }, [focusId])
}
