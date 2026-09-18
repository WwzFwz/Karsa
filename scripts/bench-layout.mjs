/**
 * How the layout behaves on a room nobody has built yet.
 *
 * The sample room has 24 nodes; a real workshop reaches a few hundred, and
 * section 10 makes promises about how the canvas feels that were never checked
 * against anything bigger. This measures the one part that is pure computation
 * and therefore measurable without a browser: turning a tree into positions,
 * for every shape, at sizes nobody has tried.
 */

import { build } from 'esbuild'
import { rmSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const outfile = 'node_modules/.cache/karsa-bench/layout.mjs'
rmSync('node_modules/.cache/karsa-bench', { recursive: true, force: true })
await build({
  stdin: {
    contents: `
      export { layoutFor } from './src/core/shape/layout'
      export { projectTree } from './src/core/tree/project'
      export { applyCommand } from './src/core/commands/apply'
      export { buildSeedDoc } from './src/store/seed/room'
    `,
    resolveDir: '.',
    loader: 'ts',
  },
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  logLevel: 'warning',
})

const { layoutFor, projectTree, applyCommand, buildSeedDoc } = await import(pathToFileURL(outfile).href)

/** A wide, shallow tree, which is what a brainstorm actually produces. */
function grow(total) {
  let doc = buildSeedDoc({ id: 'BIG-001', title: 'Beban', creator: { id: 'a_uji', name: 'Uji' } })
  const roots = Object.keys(doc.nodes)
  const ids = [...roots]
  let made = Object.keys(doc.nodes).length
  let i = 0
  while (made < total) {
    const parentId = ids[i % ids.length]
    const { doc: next, result } = applyCommand(doc, {
      type: 'createNode',
      parentId,
      kind: 'idea',
      title: `Gagasan nomor ${made} dengan judul yang cukup panjang`,
    }, { actorId: 'a_uji', inputPath: 'keyboard' })
    if (!result.ok) throw new Error(result.violation.message)
    doc = next
    const created = result.events.find((e) => e.type === 'createNode')?.payload.nodeId
    if (created) ids.push(created)
    made += 1
    // Every eighth node starts a new branch, so the tree is not one long spine.
    if (made % 8 === 0) i += 1
  }
  return doc
}

const SHAPES = ['mindmap', 'flow', 'timeline', 'columns', 'tree']
const SIZES = [24, 100, 200, 500]
const runs = 20

console.log('simpul | bentuk    | proyeksi | tata letak | total per frame')
console.log('-------|-----------|----------|------------|----------------')
for (const size of SIZES) {
  const doc = grow(size)
  const actual = Object.keys(doc.nodes).length
  for (const shape of SHAPES) {
    const tree = projectTree(doc)
    const visible = new Set(tree.preorder)
    const measured = new Map()
    // Warm, so the first run does not measure the JIT.
    layoutFor(shape, tree, visible, measured)

    let tp = 0
    let tl = 0
    for (let r = 0; r < runs; r += 1) {
      let t = process.hrtime.bigint()
      const t2 = projectTree(doc)
      tp += Number(process.hrtime.bigint() - t) / 1e6
      t = process.hrtime.bigint()
      layoutFor(shape, t2, new Set(t2.preorder), measured)
      tl += Number(process.hrtime.bigint() - t) / 1e6
    }
    const p = tp / runs
    const l = tl / runs
    const flag = p + l > 16 ? '  <-- melewati satu frame' : ''
    console.log(
      `${String(actual).padStart(6)} | ${shape.padEnd(9)} | ${p.toFixed(2).padStart(8)} | ${l.toFixed(2).padStart(10)} | ${(p + l).toFixed(2).padStart(8)} ms${flag}`,
    )
  }
}
