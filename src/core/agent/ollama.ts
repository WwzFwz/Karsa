/**
 * A real local model, behind the same seam as the keyword matcher.
 *
 * Two things make this work on a 7B model rather than merely appear to:
 *
 * 1. **Constrained decoding with a JSON schema**, not "please reply in JSON".
 *    Ollama's `format` field takes a schema and the sampler is restricted to
 *    tokens that keep the output valid. Small models do not fail because they
 *    are stupid; they fail because their output shape wanders (section 8).
 *
 * 2. **Structure as the prompt, never a screenshot.** What goes over the wire
 *    is the outline, the focused node and the tool names -- small, exact, and
 *    the reason the privacy claim survives having an assistant at all.
 *
 * The model chooses a route and a title. It never chooses node ids, never
 * chooses coordinates, and never produces commands directly: the commands are
 * built here from the template registry, so a hallucinated field cannot become
 * a malformed document. The model has an opinion; the code keeps the rules.
 */

import { expandTemplate, templateSize } from '../templates/expand'
import { templateById, TEMPLATES } from '../templates/registry'
import { buildContext, renderContext } from './context'
import { namedIn, plan } from './orchestrator'
import type { Plan, PlanStep } from './types'
import type { PlanInput } from './provider'

const ENDPOINT = 'http://localhost:11434'
const MODEL = 'qwen2.5:7b'

/** Small enough that a wrong answer is still a valid one. */
const SCHEMA = {
  type: 'object',
  properties: {
    rute: { type: 'string', enum: ['alat', 'susun', 'ambigu', 'tak-dikenali'] },
    templat: { type: 'string', enum: [...TEMPLATES.map((t) => t.id), 'none'] },
    /** Only when rute is 'ambigu'. */
    pilihan: { type: 'array', items: { type: 'string' } },
    judul: { type: 'string' },
    disebut_langsung: { type: 'boolean' },
    alasan: { type: 'string' },
  },
  required: ['rute', 'templat', 'judul', 'disebut_langsung', 'alasan'],
} as const

interface ModelAnswer {
  rute: 'alat' | 'susun' | 'ambigu' | 'tak-dikenali'
  templat: string
  pilihan?: string[]
  judul: string
  disebut_langsung: boolean
  alasan: string
}

const SYSTEM = [
  'Kamu bagian dari alat papan kerja rapat berbahasa Indonesia.',
  'Tugasmu satu: menentukan apakah ucapan pengguna meminta sebuah templat rapat, atau cuma isi biasa.',
  '',
  'Aturan:',
  '- Kalau pengguna menyebut nama templat, rute = "alat" dan disebut_langsung = true.',
  '- Kalau tidak menyebut tapi maksud kalimatnya jelas mengarah ke satu templat, rute = "alat" dan disebut_langsung = false.',
  '- Kalau dua templat sama-sama diminta, rute = "ambigu" dan isi "pilihan" dengan id templatnya.',
  '- Kalau cuma menambah atau mengubah isi biasa, rute = "susun" dan templat = "none".',
  '- Kalau tidak bisa dipahami, rute = "tak-dikenali".',
  '- "judul" maksimal 60 karakter, dalam Bahasa Indonesia, tanpa tanda kutip.',
  '- "alasan" satu kalimat pendek Bahasa Indonesia, menjelaskan kenapa rute itu dipilih.',
  '- Jangan pernah mengarang id templat di luar daftar.',
].join('\n')

export async function probeOllama(): Promise<{ ready: boolean; detail: string }> {
  try {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 1500)
    const response = await fetch(`${ENDPOINT}/api/tags`, { signal: controller.signal })
    window.clearTimeout(timer)
    if (!response.ok) return { ready: false, detail: `Ollama menjawab ${response.status}.` }
    const body = (await response.json()) as { models?: { name: string }[] }
    const names = (body.models ?? []).map((model) => model.name)
    if (!names.includes(MODEL)) {
      return { ready: false, detail: `Ollama jalan, tapi ${MODEL} belum diunduh.` }
    }
    return { ready: true, detail: `${MODEL}, di perangkat ini.` }
  } catch {
    return { ready: false, detail: 'Ollama tidak terjangkau di localhost:11434.' }
  }
}

function stepFrom(answer: ModelAnswer, input: PlanInput): PlanStep | null {
  const spec = templateById(answer.templat)
  if (!spec) return null
  const built = spec.build()
  // The model may retitle the container. It may not restructure it: the shape
  // of a retro board is not a thing worth letting a 7B model improvise.
  const titled = answer.judul.trim()
  const root = titled ? { ...built, title: titled.slice(0, 60) } : built
  return {
    agent: 'pemilih',
    preview: `Siapkan ${spec.label.toLowerCase()}: ${templateSize(root)} simpul di bawah induk terpilih.`,
    confidence: answer.disebut_langsung ? 0.92 : 0.6,
    commands: expandTemplate(root, input.focusId),
    source: { kind: spec.id === 'voting' ? 'alat' : 'templat', id: spec.id, label: spec.label },
  }
}

export async function planWithOllama(input: PlanInput): Promise<Plan> {
  /*
    The brake is code, not prompt.

    Rule: two templates named in one sentence must produce a question
    (section 8, D46). The eval showed the model ignoring that instruction, and
    that is the correct thing to learn from it -- a safety rule that depends on
    a 7B model remembering a line of prose is not a safety rule. So the check
    runs before the model is asked at all, and the model never gets the chance
    to choose for somebody.
  */
  const named = namedIn(input.transcript)
  if (named.length > 1) {
    const choices = named
      .map((id) => templateById(id))
      .filter((spec): spec is NonNullable<typeof spec> => Boolean(spec))
      .map((spec) => ({
        id: spec.id,
        label: spec.label,
        commands: expandTemplate(spec.build(), input.focusId),
      }))
    return {
      intent: 'ambigu',
      reason: 'Dua alat disebut dalam satu kalimat, jadi ini tidak ditebak.',
      steps: [],
      question: {
        question: `Yang mana dulu: ${choices.map((c) => c.label).join(' atau ')}?`,
        choices,
      },
    }
  }

  const context = buildContext(input.doc, input.tree, input.focusId)
  const body = {
    model: MODEL,
    stream: false,
    format: SCHEMA,
    options: { temperature: 0.1 },
    messages: [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: `Konteks ruang:\n${renderContext(context)}\n\nUcapan: "${input.transcript}"`,
      },
    ],
  }

  const response = await fetch(`${ENDPOINT}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`Ollama menjawab ${response.status}`)
  const payload = (await response.json()) as { message?: { content?: string } }
  const answer = JSON.parse(payload.message?.content ?? '{}') as ModelAnswer

  if (answer.rute === 'ambigu' && (answer.pilihan?.length ?? 0) > 1) {
    const choices = (answer.pilihan ?? [])
      .map((id) => templateById(id))
      .filter((spec): spec is NonNullable<typeof spec> => Boolean(spec))
      .map((spec) => ({
        id: spec.id,
        label: spec.label,
        commands: expandTemplate(spec.build(), input.focusId),
      }))
    if (choices.length > 1) {
      return {
        intent: 'ambigu',
        reason: answer.alasan || 'Dua templat sama-sama mungkin.',
        steps: [],
        question: {
          question: `Yang mana dulu: ${choices.map((c) => c.label).join(' atau ')}?`,
          choices,
        },
      }
    }
  }

  if (answer.rute === 'alat') {
    const step = stepFrom(answer, input)
    if (step) {
      return {
        intent: answer.disebut_langsung ? 'alat-diminta' : 'alat-diusulkan',
        reason: answer.alasan || 'Model memilih templat ini.',
        steps: [step],
      }
    }
  }

  /*
    The model said no tool. Before believing it, check whether the sentence
    actually named one: the eval showed qwen answering "susun" to sentences
    with a template's name in them, and a keyword that is present is not a
    judgement call. Rules provide the floor, the model provides the reach.
  */
  if (named.length === 1) {
    const fromRules = plan(input)
    if (fromRules.steps.length > 0) {
      return {
        ...fromRules,
        reason: `${fromRules.reason} (Model menjawab "${answer.rute}"; namanya tetap disebut, jadi aturan yang dipakai.)`,
      }
    }
  }

  // 'susun' and anything else lands here, and the caller hands the sentence to
  // the structure stage. Refusing to answer is a valid answer; inventing one on
  // a shared canvas is not (section 8).
  return {
    intent: answer.rute === 'tak-dikenali' ? 'tak-dikenali' : 'susun',
    reason: answer.alasan || 'Tidak ada templat yang diminta.',
    steps: [],
  }
}
