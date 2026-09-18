/**
 * Where the board sits and how big it is: zoom, panning, and the sizing.
 *
 * All of it is view state, never document state (D5, D29). Two people may sit
 * at different magnifications, scrolled to different corners, and disagree
 * about nothing -- because pointing travels as a node id and never as a
 * coordinate. That is the same reason this can live in a hook at all: nothing
 * here is worth telling anybody else.
 *
 * The board is deliberately larger than the diagram. Sizing it to
 * `max(window, content)` looked right and was the bug: when the diagram fitted,
 * scrollWidth equalled clientWidth, the scroll range was zero, and any card
 * under the inspector could never be pulled out from under it. Scroll range has
 * to exist precisely where a panel covers the canvas, or that strip of board is
 * unreachable.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Insets } from './viewport'
import type { Point } from '../../core/shape/layout'

export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 2

/** Clear board past the content, so the diagram is never flush with an edge. */
const BOARD_SLACK = 320

/** Below about two thirds, titles stop being readable. */
const READABLE = 0.65

/** How the diagram reaches across the board, as the layout currently stands. */
export interface Reach {
  width: number
  height: number
  minX: number
  minY: number
}

export interface BoardView {
  zoom: number
  /** Zoom about a screen point, so the thing under the cursor stays put. */
  zoomAt: (next: number, clientX?: number, clientY?: number) => void
  /** Shrink until the whole diagram fits the space the chrome leaves free. */
  zoomToFit: () => void
  /** A screen point in board coordinates. The stage is scaled; pixels are not. */
  toStage: (clientX: number, clientY: number) => Point
  /** The scrollable area, chrome padding included. */
  sizer: { w: number; h: number }
  /** Where board coordinate zero sits inside the sizer. */
  offset: Point
  /** The stage's own size, before scaling. */
  stage: { w: number; h: number }
  /** True while the empty board is being dragged. */
  panning: boolean
  pan: {
    start: (event: { clientX: number; clientY: number }) => void
    move: (event: { clientX: number; clientY: number }) => boolean
    stop: () => void
  }
}

export function useBoardView({
  viewportRef,
  stageRef,
  /** The diagram's extent, and the board origin that follows it (D84). */
  reach,
  origin,
  slack,
  inset,
  viewBox,
}: {
  viewportRef: { current: HTMLDivElement | null }
  stageRef: { current: HTMLDivElement | null }
  reach: Reach
  origin: Point
  slack: number
  inset: Insets
  viewBox: { w: number; h: number }
}): BoardView {
  const [zoom, setZoom] = useState(1)
  const [panning, setPanning] = useState(false)
  const panRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null)

  const toStage = useCallback(
    (clientX: number, clientY: number): Point => {
      const rect = stageRef.current?.getBoundingClientRect()
      return { x: (clientX - (rect?.left ?? 0)) / zoom, y: (clientY - (rect?.top ?? 0)) / zoom }
    },
    [stageRef, zoom],
  )

  const zoomAt = useCallback<BoardView['zoomAt']>(
    (next, clientX, clientY) => {
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
    [viewportRef, zoom],
  )

  const boardSize = useCallback(
    (atZoom: number, contentW: number, contentH: number) => ({
      w: Math.max(viewBox.w + inset.left + inset.right, contentW * atZoom + BOARD_SLACK * 2),
      h: Math.max(viewBox.h + inset.top + inset.bottom, contentH * atZoom + BOARD_SLACK * 2),
    }),
    [viewBox, inset],
  )

  const stage = { w: reach.width + origin.x + slack, h: reach.height + origin.y + slack }
  const sizer = boardSize(zoom, stage.w, stage.h)
  const offset = { x: (sizer.w - stage.w * zoom) / 2, y: (sizer.h - stage.h * zoom) / 2 }

  /** Put the diagram in the middle of the free space, not of the window. */
  const centreOnContent = useCallback(
    (atZoom: number) => {
      const vp = viewportRef.current
      if (!vp) return
      const freeCentreX = inset.left + (vp.clientWidth - inset.left - inset.right) / 2
      const freeCentreY = inset.top + (vp.clientHeight - inset.top - inset.bottom) / 2
      const stagedW = reach.width + origin.x + slack
      const stagedH = reach.height + origin.y + slack
      const { w, h } = boardSize(atZoom, stagedW, stagedH)
      // Centre the diagram, not the padding around it. It starts at `minX`, not
      // at zero, so its middle has to be read from both ends.
      const midX = origin.x + (reach.minX + reach.width) / 2
      const midY = origin.y + (reach.minY + reach.height) / 2
      vp.scrollLeft = (w - stagedW * atZoom) / 2 + midX * atZoom - freeCentreX
      vp.scrollTop = (h - stagedH * atZoom) / 2 + midY * atZoom - freeCentreY
    },
    [viewportRef, inset, reach, boardSize, origin.x, origin.y, slack],
  )

  /** How small the diagram would have to be to fit the window whole. */
  const fitted = useCallback(() => {
    const vp = viewportRef.current
    if (!vp) return 1
    // Fit against the window, not against what the chrome leaves: subtracting
    // the panels shrank the diagram to a third of the screen for no good reason.
    const usableW = Math.max(240, vp.clientWidth - 160)
    const usableH = Math.max(240, vp.clientHeight - 200)
    return Math.min(1, usableW / reach.width, usableH / reach.height)
  }, [viewportRef, reach.width, reach.height])

  const zoomToFit = useCallback(() => {
    if (!viewportRef.current) return
    const next = Math.max(MIN_ZOOM, fitted())
    setZoom(next)
    requestAnimationFrame(() => centreOnContent(next))
  }, [viewportRef, fitted, centreOnContent])

  // Ctrl with + - 0, dispatched from the global shortcuts.
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

  /*
    Fit on arrival when the diagram is bigger than the space it has.

    Padding alone only clears the cards at the edges of a scroll; anything in
    the middle of a large diagram still passes under a floating bar. Opening at
    a zoom where the whole thing fits means nothing has to pass under anything.

    Fit is for seeing the whole shape and the button is always there for it.
    Opening at it is different: an unreadable overview is worse than a readable
    fragment somebody can pan, so the opening zoom has a floor.
  */
  const didFit = useRef(false)
  useEffect(() => {
    if (didFit.current) return
    const vp = viewportRef.current
    if (!vp || vp.clientWidth === 0) return
    didFit.current = true
    const overflows =
      reach.width > vp.clientWidth - inset.left - inset.right ||
      reach.height > vp.clientHeight - inset.top - inset.bottom
    window.setTimeout(() => {
      if (!overflows) {
        centreOnContent(zoom)
        return
      }
      const opening = Math.max(READABLE, fitted())
      setZoom(opening)
      requestAnimationFrame(() => centreOnContent(opening))
    }, 140)
  }, [viewportRef, reach, inset, centreOnContent, fitted, zoom])

  /*
    Panning the board by dragging its empty ground, the way FigJam does, plus
    the middle button anywhere. Scrollbars alone made a large diagram feel
    locked in place.

    Navigation and nothing else -- it moves the viewport, never a card, so it
    cannot collide with rule 2 or with D6. The keyboard equivalent already
    exists and is better: arrowing through the tree scrolls the focused card
    into view on its own.

    Space is deliberately not a modifier here. It is the talk switch, and the
    person who most needs panning is often the one holding it.
  */
  const pan = {
    start: (event: { clientX: number; clientY: number }) => {
      const vp = viewportRef.current
      if (!vp) return
      panRef.current = { x: event.clientX, y: event.clientY, left: vp.scrollLeft, top: vp.scrollTop }
      setPanning(true)
    },
    move: (event: { clientX: number; clientY: number }) => {
      const start = panRef.current
      const vp = viewportRef.current
      if (!start || !vp) return false
      vp.scrollLeft = start.left - (event.clientX - start.x)
      vp.scrollTop = start.top - (event.clientY - start.y)
      return true
    },
    stop: () => {
      if (!panRef.current) return
      panRef.current = null
      setPanning(false)
    },
  }

  return { zoom, zoomAt, zoomToFit, toStage, sizer, offset, stage, panning, pan }
}
