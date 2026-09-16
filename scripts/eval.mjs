/**
 * Bundles the eval runner with esbuild and runs it on node.
 *
 * esbuild ships inside vite, so this adds no dependency -- which matters more
 * than it sounds: classroom mode is the promise that this project runs on a
 * laptop with no network, and a test command that needs an install is a test
 * command nobody runs on the day it would have helped.
 */

import { build } from 'esbuild'
import { mkdir, rm } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const out = resolve('node_modules/.cache/karsa-eval.mjs')

await mkdir(resolve('node_modules/.cache'), { recursive: true })
await build({
  entryPoints: ['src/eval/run-eval.ts'],
  outfile: out,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  // The browser globals the app uses are not reachable from these modules, but
  // failing loudly beats a stub that quietly returns the wrong thing.
  logLevel: 'warning',
})

try {
  await import(pathToFileURL(out).href)
} finally {
  await rm(out, { force: true })
}
