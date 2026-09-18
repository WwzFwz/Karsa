/**
 * Puts the ONNX runtime beside the app instead of on a CDN.
 *
 * transformers.js defaults `wasmPaths` to cdn.jsdelivr.net, which quietly
 * undoes the promise in section 7: a room can have every model file on its own
 * server and still not hear a word, because the runtime that reads them is
 * fetched from the other side of the internet. These two files are already in
 * node_modules; copying them into `public/` makes them part of the build, so a
 * classroom install carries its own runtime like it carries its own models.
 *
 * Runs before `dev` and `build`. Idempotent, and skipped when nothing changed.
 */

import { copyFileSync, mkdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const to = 'public/ort'

/*
  Two runtimes, because the two workers need different things.

  Transcription wants WebGPU, which lives in the `.jsep` build; voice detection
  is one tiny model and runs on the CPU build, which is half the size. Taking
  the jsep one for both would mean the detector pulled 20 MB to answer a
  yes-or-no question.
*/
const files = [
  ['node_modules/@huggingface/transformers/dist', 'ort-wasm-simd-threaded.jsep.mjs'],
  ['node_modules/@huggingface/transformers/dist', 'ort-wasm-simd-threaded.jsep.wasm'],
  ['node_modules/onnxruntime-web/dist', 'ort-wasm-simd-threaded.wasm'],
  ['node_modules/onnxruntime-web/dist', 'ort-wasm-simd-threaded.mjs'],
]

mkdirSync(to, { recursive: true })
let copied = 0
for (const [from, file] of files) {
  const source = join(from, file)
  const target = join(to, file)
  try {
    const a = statSync(source)
    const b = statSync(target)
    if (a.size === b.size && b.mtimeMs >= a.mtimeMs) continue
  } catch {
    // Not copied yet, or the source moved: fall through and copy.
  }
  copyFileSync(source, target)
  copied += 1
}
if (copied > 0) console.log(`ONNX runtime disalin ke ${to} (${copied} berkas).`)
