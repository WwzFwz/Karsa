/**
 * Where the board actually is, as plain functions.
 *
 * No React here on purpose. Everything in this file is either a reading of the
 * DOM or a calculation over numbers, and neither needs a component's lifecycle
 * to be correct -- so neither should be a hook. Keeping the arithmetic out of a
 * hook is what makes it testable at all: `scrollToShow` decides where the board
 * has to go, and it can be asked that in node with no browser in sight.
 *
 * The hook that owns the effects is `useFocusInView`.
 */

export interface Insets {
  top: number
  right: number
  bottom: number
  left: number
}

/**
 * How much of the viewport each floating panel covers.
 *
 * Every panel is anchored to an edge, so the edge it is nearest to is the one
 * it occludes. Guessing from width and height instead needed thresholds, and
 * the thresholds missed the inspector on a narrow window -- too narrow to count
 * as a band, too short to count as a column, so it was ignored entirely and
 * nodes kept sliding underneath it.
 */
export function measureChrome(box: DOMRect): Insets {
  const pad: Insets = { top: 0, right: 0, bottom: 0, left: 0 }
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

/** A rectangle on the board, in the scrolled element's own coordinates. */
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** What the scrolling element currently shows. */
export interface View {
  /** The element's full size on screen, chrome included. */
  width: number
  height: number
  /** The part that scrolls. */
  clientWidth: number
  clientHeight: number
  scrollLeft: number
  scrollTop: number
}

/** Clear space kept between a node and whatever is covering the board. */
const MARGIN = 24

/**
 * Where to scroll so `node` is not hidden, or null when it already is not.
 *
 * It moves the minimum needed rather than centring, so the diagram does not
 * jump around under somebody working near an edge -- arrowing along a row of
 * siblings should nudge the board, not restage it.
 *
 * The insets matter because the canvas runs edge to edge (D25): the top bar,
 * the toolbar, the sidebar, the inspector and the dock all float above it, so
 * "inside the window" and "visible" are different questions. Scrolling against
 * the raw viewport parked the focused node underneath one of them with half of
 * it showing.
 */
export function scrollToShow(node: Rect, view: View, insets: Insets): { left: number; top: number } | null {
  const pad = { ...insets }

  // If the chrome would leave less room than a node needs, showing it somewhere
  // beats refusing to scroll at all.
  if (view.width - pad.left - pad.right < node.w + 80) {
    pad.left = 0
    pad.right = 0
  }
  if (view.height - pad.top - pad.bottom < node.h + 80) {
    pad.top = 0
    pad.bottom = 0
  }

  const { scrollLeft: left, scrollTop: top } = view
  const viewLeft = left + pad.left + MARGIN
  const viewRight = left + view.clientWidth - pad.right - MARGIN
  const viewTop = top + pad.top + MARGIN
  const viewBottom = top + view.clientHeight - pad.bottom - MARGIN

  let nextLeft = left
  let nextTop = top

  if (node.x < viewLeft) nextLeft = Math.max(0, node.x - pad.left - MARGIN)
  else if (node.x + node.w > viewRight) nextLeft = node.x + node.w + pad.right + MARGIN - view.clientWidth

  if (node.y < viewTop) nextTop = Math.max(0, node.y - pad.top - MARGIN)
  else if (node.y + node.h > viewBottom) nextTop = node.y + node.h + pad.bottom + MARGIN - view.clientHeight

  // Under a pixel is not a move; scrolling anyway would fight a smooth scroll
  // that is already on its way.
  if (Math.abs(nextLeft - left) < 1 && Math.abs(nextTop - top) < 1) return null
  return { left: nextLeft, top: nextTop }
}
