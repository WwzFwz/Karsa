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

/*
  Outside node_modules, and that is not a matter of taste.

  Node's test runner skips node_modules when it resolves the files it is given
  -- which is right for a project's own tests, and fatal for bundles parked
  there. Older Node took an explicit path as an explicit path and ran it
  anyway; from 22.2x the argument is matched, node_modules is filtered out
  first, and every file "could not be found". It passed on the laptop and died
  on the runner, which is the whole reason CI exists.

  `.cache/` is already ignored by git.
*/
const outdir = '.cache/karsa-test'
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
