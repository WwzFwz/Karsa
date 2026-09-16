import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { checkMove, checkTitle, TITLE_MAX } from './invariants'
import { rawNode, withNodes } from '../testing/fixtures'

describe('rule 4: titles', () => {
  it('rejects an empty title', () => {
    assert.equal(checkTitle('   ')?.code, 'title_empty')
  })

  it('accepts exactly the limit and rejects one more', () => {
    assert.equal(checkTitle('a'.repeat(TITLE_MAX)), null)
    assert.notEqual(checkTitle('a'.repeat(TITLE_MAX + 1)), null)
  })
})

describe('rule 1: one parent, never a cycle', () => {
  // root <- a <- b
  const doc = withNodes(rawNode('root', null), rawNode('a', 'root'), rawNode('b', 'a'))

  it('refuses a node as its own parent', () => {
    assert.equal(checkMove(doc, 'a', 'a')?.code, 'self_parent')
  })

  it('refuses moving a node under its own descendant', () => {
    assert.equal(checkMove(doc, 'root', 'b')?.code, 'cycle')
  })

  it('allows a legal move', () => {
    assert.equal(checkMove(doc, 'b', 'root'), null)
  })

  it('refuses a parent that does not exist', () => {
    assert.equal(checkMove(doc, 'b', 'ghost')?.code, 'missing_parent')
  })
})
