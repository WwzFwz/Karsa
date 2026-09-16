/**
 * Runs every *.test.ts under src with node's own test runner.
 *
 * esbuild (already inside vite) turns each test file into a node bundle; no test
 * framework is installed. Tests live next to the code they check.
 */

import { build } from 'esbuild'
import { spawnSync } from 'node:child_process'
import { readdirSync, rmSync } from 'node:fs'
import { join, sep } from 'node:path'

const tests = []
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path)
    else if (entry.name.endsWith('.test.ts')) tests.push(path.replaceAll(sep, '/'))
  }
}
walk('src')

const outdir = 'node_modules/.cache/karsa-test'
rmSync(outdir, { recursive: true, force: true })
await build({
  entryPoints: tests,
  outdir,
  outbase: 'src',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outExtension: { '.js': '.mjs' },
  logLevel: 'warning',
})

const bundles = tests.map((test) => join(outdir, test.replace(/^src\//, '').replace(/[.]ts$/, '.mjs')))
const { status } = spawnSync(process.execPath, ['--test', ...bundles], { stdio: 'inherit' })
process.exit(status ?? 1)
