import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { scrollToShow, type Insets, type View } from './viewport'

/*
  This arithmetic decides whether somebody navigating by keyboard can see where
  they are, and it had no test until it was lifted out of the component -- which
  is most of the reason for lifting it out. D19 and D30 are both here.
*/

const view = (over: Partial<View> = {}): View => ({
  width: 1200,
  height: 800,
  clientWidth: 1200,
  clientHeight: 800,
  scrollLeft: 0,
  scrollTop: 0,
  ...over,
})

const NONE: Insets = { top: 0, right: 0, bottom: 0, left: 0 }
const node = (x: number, y: number) => ({ x, y, w: 120, h: 48 })

describe('scrolling the focused node into view', () => {
  it('does nothing when the node is already clear of everything', () => {
    assert.equal(scrollToShow(node(400, 300), view(), NONE), null)
  })

  it('moves the least it can, rather than centring', () => {
    // Just off the right edge: the board should nudge, not restage.
    const out = scrollToShow(node(1150, 300), view(), NONE)
    assert.deepEqual(out, { left: 1150 + 120 + 24 - 1200, top: 0 })
  })

  it('never scrolls past the start of the board', () => {
    const out = scrollToShow(node(0, 0), view({ scrollLeft: 300, scrollTop: 300 }), NONE)
    assert.deepEqual(out, { left: 0, top: 0 })
  })

  it('counts the panels floating over the board, not the window (D30)', () => {
    // An inspector 360 wide on the right: a node at x=900 is inside the window
    // and underneath the panel, so it still has to move.
    const inspector: Insets = { ...NONE, right: 360 }
    assert.equal(scrollToShow(node(900, 300), view(), NONE), null, 'tanpa panel: sudah terlihat')
    const out = scrollToShow(node(900, 300), view(), inspector)
    assert.ok(out, 'dengan panel: harus digulir')
    assert.equal(out.left, 900 + 120 + 360 + 24 - 1200)
  })

  it('gives up on the insets when they would leave no room at all', () => {
    // A narrow window with a wide panel: showing the node somewhere beats
    // refusing to scroll because there is nowhere perfect to put it.
    const narrow = view({ width: 420, clientWidth: 420 })
    const huge: Insets = { ...NONE, left: 200, right: 200 }
    const out = scrollToShow(node(900, 300), narrow, huge)
    assert.ok(out)
    assert.equal(out.left, 900 + 120 + 24 - 420, 'inset diabaikan, bukan diperkecil')
  })

  it('handles both axes at once', () => {
    const out = scrollToShow(node(1400, 1000), view(), NONE)
    assert.deepEqual(out, { left: 1400 + 120 + 24 - 1200, top: 1000 + 48 + 24 - 800 })
  })

  it('treats a move under a pixel as no move', () => {
    // Otherwise every re-render would start a fresh smooth scroll on top of the
    // one already running, which is exactly the judder D84 fixed.
    const out = scrollToShow(node(24, 24), view({ scrollLeft: 0.4, scrollTop: 0.4 }), NONE)
    assert.equal(out, null)
  })
})
