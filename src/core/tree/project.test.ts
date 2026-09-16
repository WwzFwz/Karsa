import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { projectTree } from './project'
import { rawNode, withNodes } from '../testing/fixtures'

/*
  Section 9: two people moving nodes crosswise can merge into a cycle. The
  projection must still produce a tree, and every device must pick the same cut.
*/
describe('cycle recovery as a read-time projection', () => {
  it('turns a two-node cycle back into a tree without losing a node', () => {
    const tree = projectTree(withNodes(rawNode('a', 'b'), rawNode('b', 'a')))
    assert.equal(tree.preorder.length, 2)
    assert.equal(tree.repairs.length, 1)
    assert.equal(tree.rootIds.length, 1)
  })

  it('cuts the same node whatever order the nodes arrive in', () => {
    const forward = projectTree(withNodes(rawNode('a', 'c'), rawNode('b', 'a'), rawNode('c', 'b')))
    const backward = projectTree(withNodes(rawNode('c', 'b'), rawNode('b', 'a'), rawNode('a', 'c')))
    assert.deepEqual(
      forward.repairs.map((r) => r.nodeId),
      backward.repairs.map((r) => r.nodeId),
    )
  })

  it('lifts a node whose parent is missing to the root', () => {
    const tree = projectTree(withNodes(rawNode('orphan', 'deleted')))
    assert.deepEqual(tree.rootIds, ['orphan'])
    assert.equal(tree.repairs[0]?.reason, 'missing_parent')
  })

  it('leaves a healthy tree untouched', () => {
    const tree = projectTree(withNodes(rawNode('root', null), rawNode('a', 'root', 'b'), rawNode('b', 'root', 'c')))
    assert.equal(tree.repairs.length, 0)
    assert.deepEqual(tree.preorder, ['root', 'a', 'b'])
  })
})
