import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { orderBetween } from './order'

describe('fractional sibling order', () => {
  it('always lands strictly between its bounds', () => {
    assert.ok(orderBetween('a', 'c') > 'a')
    assert.ok(orderBetween('a', 'c') < 'c')
  })

  it('stays ordered after many inserts at the same spot', () => {
    // The worst case for fractional keys: always inserting right after the first.
    const low = orderBetween(null, null)
    let high = orderBetween(low, null)
    for (let i = 0; i < 1000; i += 1) {
      const middle = orderBetween(low, high)
      assert.ok(low < middle && middle < high, `insert ${i}: ${low} < ${middle} < ${high}`)
      high = middle
    }
  })

  it('appends after the last key when there is no upper bound', () => {
    const first = orderBetween(null, null)
    assert.ok(orderBetween(first, null) > first)
  })
})
