/**
 * Downloads the speech models once, so a room can hear with no internet.
 *
 *   npm run models            (whisper-base, the default)
 *   npm run models -- --all   (adds whisper-small)
 *
 * Section 7 promises mode kelas runs on a teacher's laptop with no network at
 * all. That has never been true for speech: the first time anybody pressed
 * Bicara, transformers.js reached for the Hugging Face CDN. This puts the same
 * files on disk in the layout the CDN uses, the server hands them out at
 * /models, and `VITE_MODEL_URL=/models` points devices there.
 *
 * Run once on a machine that does have internet; copy the folder to the one
 * that does not.
 */

import { mkdir, writeFile, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const HOST = 'https://huggingface.co'
const REVISION = 'main'
const out = process.env.KARSA_MODELS ?? 'server/models'
const all = process.argv.includes('--all')

const models = ['onnx-community/whisper-base', ...(all ? ['onnx-community/whisper-small'] : [])]

/*
  The voice detector, which Mode Menyimak needs before it can hear anything.
  Two megabytes, and without it an open microphone has no idea where one
  sentence stops -- so it is not optional the way the larger transcriber is.
*/
const VAD = { repo: 'onnx-community/silero-vad', files: ['onnx/model.onnx'] }

/*
  Exactly the files transformers.js asks for, and no more.

  The repositories carry every quantisation; fetching all of them is gigabytes
  of files nothing will ever open. These are the ones the worker names: fp32
  encoder and q4 decoder for WebGPU, q8 for the WASM fallback.
*/
const FILES = [
  'config.json',
  'generation_config.json',
  'preprocessor_config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'onnx/encoder_model.onnx',
  'onnx/encoder_model_quantized.onnx',
  'onnx/decoder_model_merged_fp16.onnx',
  'onnx/decoder_model_merged_q4.onnx',
  'onnx/decoder_model_merged_quantized.onnx',
]

const human = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`

let total = 0
for (const model of models) {
  console.log(`\n${model}`)
  for (const file of FILES) {
    const target = join(out, model, file)
    try {
      const existing = await stat(target)
      console.log(`  ada       ${file} (${human(existing.size)})`)
      total += existing.size
      continue
    } catch {
      // Not there yet, which is the normal case.
    }
    const url = `${HOST}/${model}/resolve/${REVISION}/${file}`
    const res = await fetch(url)
    if (!res.ok) {
      // Repositories differ in which quantisations they ship; a missing one is
      // not a failure, it just means that device path uses another file.
      console.log(`  lewati    ${file} (${res.status})`)
      continue
    }
    const body = Buffer.from(await res.arrayBuffer())
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, body)
    total += body.length
    console.log(`  unduh     ${file} (${human(body.length)})`)
  }
}

console.log(`
${VAD.repo}`)
for (const file of VAD.files) {
  const target = join(out, VAD.repo, file)
  try {
    const existing = await stat(target)
    console.log(`  ada       ${file} (${human(existing.size)})`)
    total += existing.size
    continue
  } catch {
    // Not there yet.
  }
  const res = await fetch(`${HOST}/${VAD.repo}/resolve/${REVISION}/${file}`)
  if (!res.ok) {
    console.log(`  GAGAL     ${file} (${res.status}) -- Mode Menyimak tidak akan jalan tanpa ini`)
    continue
  }
  const body = Buffer.from(await res.arrayBuffer())
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, body)
  total += body.length
  console.log(`  unduh     ${file} (${human(body.length)})`)
}

console.log(`\nTersimpan di ${out}, total ${human(total)}.`)
console.log('Jalankan server dengan KARSA_MODELS menunjuk ke folder itu,')
console.log('dan bangun klien dengan VITE_MODEL_URL=/models.')
