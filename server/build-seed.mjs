/**
 * Bundles seed/entry.ts, which imports the client's core/ and store/, into one
 * ES module the server loads at runtime. See seed/entry.ts for why.
 */

import { build } from 'esbuild'

await build({
  entryPoints: ['seed/entry.ts'],
  outfile: 'dist/seed.bundle.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  external: ['yjs'],
  logLevel: 'warning',
})
