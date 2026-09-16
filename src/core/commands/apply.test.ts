import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { applyCommand } from './apply'
import { emptyDoc, run } from '../testing/fixtures'

const ctx = { actorId: 'a1', inputPath: 'keyboard' as const }

describe('one door to the data', () => {
  it('a rejected command leaves the document exactly as it was', () => {
    const doc = run(emptyDoc(), { type: 'createNode', id: 'root', parentId: null, kind: 'root', title: 'Akar' })
    const { doc: after, result } = applyCommand(doc, { type: 'renameNode', id: 'root', title: '' }, ctx)
    assert.equal(result.ok, false)
    assert.equal(after, doc)
  })

  it('every accepted change writes an event with who and through which door (D8)', () => {
    const doc = run(emptyDoc(), { type: 'createNode', id: 'root', parentId: null, kind: 'root', title: 'Akar' })
    const last = doc.events[doc.events.length - 1]
    assert.equal(last.type, 'createNode')
    assert.equal(last.actorId, 'a1')
    assert.equal(last.inputPath, 'keyboard')
  })

  it('refuses a move that would create a cycle', () => {
    let doc = run(emptyDoc(), { type: 'createNode', id: 'a', parentId: null, kind: 'idea', title: 'A' })
    doc = run(doc, { type: 'createNode', id: 'b', parentId: 'a', kind: 'idea', title: 'B' })
    const { result } = applyCommand(doc, { type: 'moveNode', id: 'a', parentId: 'b' }, ctx)
    assert.equal(result.ok, false)
  })

  it('refuses a duplicate id', () => {
    const doc = run(emptyDoc(), { type: 'createNode', id: 'a', parentId: null, kind: 'idea', title: 'A' })
    const { result } = applyCommand(
      doc,
      { type: 'createNode', id: 'a', parentId: null, kind: 'idea', title: 'A lagi' },
      ctx,
    )
    assert.equal(result.ok, false)
  })
})
