/**
 * How much room the floating chrome leaves the board, kept current.
 *
 * The canvas is the background of the whole window and every bar floats above
 * it (D25), so "the window" and "the visible board" are different rectangles.
 * These numbers are the difference, and the board reserves them as padding --
 * which is what makes a floating bar harmless: at either end of a scroll every
 * card sits in clear space, and there is always a scroll position that shows
 * any card whole.
 *
 * Measured from the bars themselves rather than derived from the layout
 * variables. Deriving meant adding a guess for the toolbar's height, and the
 * guess was ten pixels short.
 */

import { useCallback, useLayoutEffect, useState } from 'react'
import { measureChrome, type Insets } from './viewport'

/** Clear space kept past the chrome, so cards do not sit flush against it. */
const BREATH = 28

/** Bars that can cover the board. `.zoom-bar` sits outside the scroll area. */
const CHROME = ['.topbar', '.canvas-toolbar', '.sidebar', '.inspector', '.dock']

export function useChromeInsets({
  viewportRef,
  /** Anything that changes which bars exist, so the observer is rebuilt. */
  watch,
}: {
  viewportRef: { current: HTMLDivElement | null }
  watch: unknown[]
}): { inset: Insets; viewBox: { w: number; h: number } } {
  const [inset, setInset] = useState<Insets>({ top: 96, right: 32, bottom: 96, left: 32 })
  const [viewBox, setViewBox] = useState({ w: 1000, h: 700 })

  /*
    Both setters keep the previous object when nothing moved by more than a
    couple of pixels. Sub-pixel jitter from a resize would otherwise be a new
    object every frame, and everything downstream -- the board's size, the
    scroll that keeps focus in view -- would rebuild with it.
  */
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
      const next: Insets = {
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
  }, [viewportRef])

  useLayoutEffect(() => {
    measure()
    const vp = viewportRef.current
    if (!vp) return
    const observer = new ResizeObserver(measure)
    observer.observe(vp)
    for (const selector of CHROME) {
      const el = document.querySelector(selector)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `watch` is the caller's list
  }, [measure, viewportRef, ...watch])

  return { inset, viewBox }
}
