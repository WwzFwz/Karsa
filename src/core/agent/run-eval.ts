/**
 * The eval runner. `npm run eval`, or `npm run eval -- --ollama`.
 *
 * Two providers, one case list, so the question "did the model make this
 * better or worse than plain rules" has an answer instead of an impression.
 * Run it before and after touching a prompt; that is the whole job.
 *
 * A failure prints the reason the case exists, because six months from now the
 * useful part of a red line is not "expected susun, got alat-diusulkan" but
 * "this sentence contains the word prioritas and is still ordinary content".
 */

import { plan } from './orchestrator'
import { planWithOllama } from './ollama'
import { CASES, type EvalCase } from './cases'
import { buildSeedDoc } from '../../store/seed/room'
import { projectTree } from '../tree/project'
import type { Plan } from './types'

/*
  Declared rather than installed. Adding @types/node would mean an install, and
  classroom mode is the promise that this project runs on a laptop with no
  network -- a test command that needs the internet is one nobody runs on the
  day it would have helped. Two members is the whole surface used here.
*/
declare const process: { argv: string[]; exit: (code: number) => never }

interface Result {
  test: EvalCase
  got: Plan
  pass: boolean
  note: string
}

const GREEN = '[32m'
const RED = '[31m'
const DIM = '[2m'
const OFF = '[0m'

function judge(test: EvalCase, got: Plan): { pass: boolean; note: string } {
  if (got.intent !== test.intent) {
    return { pass: false, note: `harap ${test.intent}, dapat ${got.intent}` }
  }
  if (!test.template) return { pass: true, note: '' }
  const chosen = got.steps[0]?.source?.id
  if (chosen !== test.template) {
    return { pass: false, note: `harap templat ${test.template}, dapat ${chosen ?? 'tidak ada'}` }
  }
  return { pass: true, note: '' }
}

async function run(useOllama: boolean): Promise<Result[]> {
  const doc = buildSeedDoc()
  const tree = projectTree(doc)
  const results: Result[] = []

  for (const test of CASES) {
    const input = { transcript: test.transcript, doc, tree, focusId: null }
    let got: Plan
    try {
      got = useOllama ? await planWithOllama(input) : plan(input)
    } catch (error) {
      got = {
        intent: 'tak-dikenali',
        reason: error instanceof Error ? error.message : 'gagal',
        steps: [],
      }
    }
    results.push({ test, got, ...judge(test, got) })
  }
  return results
}

function report(label: string, results: Result[]): number {
  const passed = results.filter((r) => r.pass).length
  console.log(`\n${label} — ${passed}/${results.length} lulus\n`)
  for (const r of results) {
    const mark = r.pass ? `${GREEN}lulus${OFF}` : `${RED}gagal${OFF}`
    console.log(`  ${mark}  ${r.test.transcript}`)
    if (!r.pass) {
      console.log(`         ${r.note}`)
      console.log(`         ${DIM}${r.test.why}${OFF}`)
      console.log(`         ${DIM}alasan model: ${r.got.reason}${OFF}`)
    }
  }
  // By group, because an average hides the shape of the failure.
  const byIntent = new Map<string, { pass: number; total: number }>()
  for (const r of results) {
    const bucket = byIntent.get(r.test.intent) ?? { pass: 0, total: 0 }
    bucket.total += 1
    if (r.pass) bucket.pass += 1
    byIntent.set(r.test.intent, bucket)
  }
  console.log('')
  for (const [intent, bucket] of byIntent) {
    console.log(`  ${intent.padEnd(16)} ${bucket.pass}/${bucket.total}`)
  }
  return passed
}

const useOllama = process.argv.includes('--ollama')
const results = await run(useOllama)
const passed = report(useOllama ? 'Ollama (qwen2.5:7b)' : 'Pencocokan aturan', results)

console.log('')
if (passed < results.length) {
  console.log(`${RED}${results.length - passed} kasus gagal.${OFF}`)
  process.exit(1)
}
console.log(`${GREEN}Semua kasus lulus.${OFF}`)
