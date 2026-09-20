import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { layoutFor, sizeOf, NODE_H, NODE_W, type LayoutResult } from './layout'
import { projectTree, type TreeProjection } from '../tree/project'
import { rawNode, withNodes } from '../testing/fixtures'
import type { Node, NodeId, RoomShape } from '../model/types'

/*
  What a layout is actually promising.

  Until now the only check on any of this was a count of overlaps run by hand
  once, after D55 -- which is to say the arithmetic that decides whether two
  cards land on top of each other had no test at all, while the bug it was
  fixing had already shipped twice. The properties below are the ones that were
  broken in the past, written down so the next break is a red test rather than
  a screenshot somebody happens to look at.

  Every shape is checked, not just the default, because each one collides in
  its own way: `tidy` through sibling spacing, `columns` through band and column
  widths, `timeline` through cumulative advance.
*/

const SHAPES: RoomShape[] = ['mindmap', 'hierarchy', 'flow', 'timeline', 'columns']

function allOf(tree: TreeProjection): Set<NodeId> {
  return new Set(tree.preorder)
}

/** Every pair of cards that share any area. Touching edges are not an overlap. */
function overlaps(
  tree: TreeProjection,
  result: LayoutResult,
  measured?: ReadonlyMap<NodeId, number>,
): [NodeId, NodeId][] {
  const boxes = [...result.positions].map(([id, p]) => {
    /*
      The height comes from the measurement, not from `sizeOf`.

      Asking `sizeOf` for both would let this check agree with a layout that
      ignores measured heights -- both sides would shrink together and the
      cards would appear not to touch. Verified by making `sizeOf` drop the
      measurement: with `sizeOf` here the overlap tests stayed green, and with
      the line below they go red.
    */
    const height = measured?.get(id) ?? sizeOf(tree, id).h
    return { id, left: p.x, top: p.y, right: p.x + sizeOf(tree, id, measured).w, bottom: p.y + height }
  })
  const hits: [NodeId, NodeId][] = []
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i]
      const b = boxes[j]
      if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) {
        hits.push([a.id, b.id])
      }
    }
  }
  return hits
}

/** A root, five children, and a grandchild under the first of them. */
function family(): Node[] {
  return [
    rawNode('root', null, 'a'),
    rawNode('a', 'root', 'b'),
    rawNode('b', 'root', 'c'),
    rawNode('c', 'root', 'd'),
    rawNode('d', 'root', 'e'),
    rawNode('e', 'root', 'f'),
    rawNode('a1', 'a', 'b'),
  ]
}

function tool(id: NodeId, kind: 'suara' | 'retro' | 'matriks', parentId: NodeId | null = null): Node {
  return { ...rawNode(id, parentId, 'z'), tool: kind }
}

describe('no shape ever draws two cards on top of each other', () => {
  for (const shape of SHAPES) {
    it(`keeps every card apart in ${shape}`, () => {
      const tree = projectTree(withNodes(...family()))
      const result = layoutFor(shape, tree, allOf(tree))
      assert.deepEqual(overlaps(tree, result), [])
    })
  }

  /*
    D55: several roots used to be placed at the same point, and a column's
    width used to be an index times one card. Both were invisible while a room
    held one tree of equally wide cards, and both were wrong the moment a tool
    was allowed to stand on its own.
  */
  for (const shape of SHAPES) {
    it(`keeps free-standing tool cards off their neighbours in ${shape}`, () => {
      const doc = withNodes(
        ...family(),
        tool('vote', 'suara'),
        rawNode('opt1', 'vote', 'a'),
        rawNode('opt2', 'vote', 'b'),
        tool('retro', 'retro'),
        rawNode('col1', 'retro', 'a'),
        tool('grid', 'matriks'),
      )
      const tree = projectTree(doc)
      const result = layoutFor(shape, tree, allOf(tree))
      assert.deepEqual(overlaps(tree, result), [])
      assert.equal(tree.rootIds.length, 4)
    })
  }

  /*
    A wide card buried inside a column, which is the case D55 actually broke on
    and the one a free-standing tool does not reach: in `columns` a root's own
    children are the column heads, so a tool that stands on its own is never
    inside a column at all. Written after checking -- putting the old bug back
    (`x += NODE_W` instead of the column's real width) left every other test
    here green, and turns this one red.
  */
  for (const shape of SHAPES) {
    it(`advances past a wide card sitting inside a column in ${shape}`, () => {
      const tree = projectTree(
        withNodes(
          rawNode('root', null, 'a'),
          rawNode('left', 'root', 'b'),
          tool('vote', 'suara', 'left'),
          rawNode('opt1', 'vote', 'a'),
          rawNode('opt2', 'vote', 'b'),
          rawNode('right', 'root', 'c'),
          rawNode('r1', 'right', 'a'),
          tool('grid', 'matriks', 'right'),
        ),
      )
      const result = layoutFor(shape, tree, allOf(tree))
      assert.deepEqual(overlaps(tree, result), [])
    })
  }

  /*
    D54: the bug that started all of this. A card is as tall as its title wraps,
    and NODE_H was only ever the shortest one possible -- so any long title
    quietly overlapped the sibling below it. The canvas measures what it painted
    and hands the numbers back; the layout has to spend them.
  */
  for (const shape of SHAPES) {
    it(`spends measured heights instead of guessing in ${shape}`, () => {
      const tree = projectTree(withNodes(...family()))
      const measured = new Map<NodeId, number>([
        ['a', 210],
        ['b', 64],
        ['c', 167],
        ['d', 62],
        ['e', 143],
        ['root', 96],
      ])
      const result = layoutFor(shape, tree, allOf(tree), measured)
      assert.deepEqual(overlaps(tree, result, measured), [])
    })
  }
})

describe('sizeOf', () => {
  it('gives a tool card its registered width, not the ordinary one', () => {
    const tree = projectTree(withNodes(tool('vote', 'suara'), rawNode('opt', 'vote')))
    assert.equal(sizeOf(tree, 'vote').w, 268)
    assert.equal(sizeOf(tree, 'opt').w, NODE_W)
  })

  it('prefers a measured height over every guess', () => {
    const tree = projectTree(withNodes(rawNode('n', null)))
    assert.equal(sizeOf(tree, 'n').h, NODE_H)
    assert.equal(sizeOf(tree, 'n', new Map([['n', 211]])).h, 211)
  })

  /*
    A zero is what a card reports on the frame before it has painted. Trusting
    it would collapse the card to nothing and pile its siblings into the same
    few pixels, which is worse than the guess it replaced.
  */
  it('ignores a height of zero from a card that has not painted yet', () => {
    const tree = projectTree(withNodes(rawNode('n', null)))
    assert.equal(sizeOf(tree, 'n', new Map([['n', 0]])).h, NODE_H)
  })
})

describe('what the caller is handed back', () => {
  it('reports a box that contains every card it placed', () => {
    const tree = projectTree(withNodes(...family(), tool('grid', 'matriks')))
    for (const shape of SHAPES) {
      const result = layoutFor(shape, tree, allOf(tree))
      for (const [id, p] of result.positions) {
        const size = sizeOf(tree, id)
        assert.ok(p.x >= 0 && p.y >= 0, `${shape}: ${id} starts outside the box`)
        assert.ok(p.x + size.w <= result.width + 0.001, `${shape}: ${id} runs past the right edge`)
        assert.ok(p.y + size.h <= result.height + 0.001, `${shape}: ${id} runs past the bottom edge`)
      }
    }
  })

  it('places exactly the visible nodes, and no others', () => {
    const tree = projectTree(withNodes(...family()))
    const visible = new Set<NodeId>(['root', 'a', 'b', 'a1'])
    for (const shape of SHAPES) {
      const result = layoutFor(shape, tree, visible)
      assert.deepEqual(new Set(result.positions.keys()), visible, `${shape} placed the wrong set`)
    }
  })

  /*
    D5 allows two devices to arrange the same room differently; it does not
    allow one device to arrange it differently twice. A layout that moves on an
    unchanged tree is a canvas that jumps, and the person who suffers most from
    that is the one D5 was written for.
  */
  it('returns the same coordinates for the same tree twice', () => {
    const tree = projectTree(withNodes(...family(), tool('vote', 'suara')))
    for (const shape of SHAPES) {
      const first = layoutFor(shape, tree, allOf(tree))
      const second = layoutFor(shape, tree, allOf(tree))
      assert.deepEqual([...first.positions], [...second.positions], `${shape} is not stable`)
      assert.equal(first.width, second.width)
      assert.equal(first.height, second.height)
    }
  })

  it('survives an empty room without returning a zero-sized board', () => {
    const tree = projectTree(withNodes())
    for (const shape of SHAPES) {
      const result = layoutFor(shape, tree, new Set())
      assert.equal(result.positions.size, 0)
      assert.ok(result.width > 0 && result.height > 0, `${shape} handed back a board of nothing`)
    }
  })

  /*
    Rule 1 is recovered at read time (D10), so a merged cycle reaches the layout
    as a tree with a cut in it. The layout must draw that tree rather than
    recurse for ever on the ring the document still holds.
  */
  it('lays out a document that merged into a cycle', () => {
    const tree = projectTree(withNodes(rawNode('a', 'c'), rawNode('b', 'a'), rawNode('c', 'b')))
    for (const shape of SHAPES) {
      const result = layoutFor(shape, tree, allOf(tree))
      assert.equal(result.positions.size, 3, `${shape} lost a node from a repaired cycle`)
      assert.deepEqual(overlaps(tree, result), [])
    }
  })
})
