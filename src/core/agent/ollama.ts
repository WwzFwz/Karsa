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
import { findNodeByTitle, normalise, tidyTitle, type StructureInput, type StructureResult } from './structure'
import { projectTree } from '../tree/project'
import type { NodeId, NodeKind, RelationKind } from '../model/types'
import { KIND_LABEL, RELATION_LABEL } from '../../ui/labels'
import { tr } from '../../i18n/lang'

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
  'Ucapan bisa Bahasa Indonesia atau English. Tulis "judul" dan "alasan" dalam bahasa yang sama dengan ucapan.',
  '',
  'Aturan:',
  '- Kalau pengguna menyebut nama templat, rute = "alat" dan disebut_langsung = true.',
  '- Kalau tidak menyebut tapi maksud kalimatnya jelas mengarah ke satu templat, rute = "alat" dan disebut_langsung = false.',
  '- Kalau dua templat sama-sama diminta, rute = "ambigu" dan isi "pilihan" dengan id templatnya.',
  '- Kalau cuma menambah atau mengubah isi biasa, rute = "susun" dan templat = "none".',
  '- Kalau tidak bisa dipahami, rute = "tak-dikenali".',
  '- "judul" maksimal 60 karakter, dalam bahasa ucapan, tanpa tanda kutip.',
  '- "alasan" satu kalimat pendek dalam bahasa ucapan, menjelaskan kenapa rute itu dipilih.',
  '- Jangan pernah mengarang id templat di luar daftar.',
].join('\n')

const KIND_BY_WORD: Record<string, NodeKind> = {
  gagasan: 'idea',
  langkah: 'step',
  keputusan: 'decision',
  pertanyaan: 'question',
  fakta: 'fact',
  tindakan: 'action',
  kelompok: 'group',
}

const RELATION_BY_WORD: Record<string, RelationKind> = {
  bergantung_pada: 'depends_on',
  menyebabkan: 'causes',
  bertentangan_dengan: 'contradicts',
  merujuk_ke: 'refers_to',
  dilanjutkan_oleh: 'sequence',
}

const STRUCTURE_SCHEMA = {
  type: 'object',
  properties: {
    operasi: {
      type: 'array',
      maxItems: 6,
      items: {
        type: 'object',
        properties: {
          jenis: { type: 'string', enum: ['tambah', 'ubah_judul', 'pindah', 'hapus', 'hubung'] },
          tipe: { type: 'string', enum: Object.keys(KIND_BY_WORD) },
          judul: { type: 'string' },
          /** Titles as they appear in the outline, never ids. */
          sasaran: { type: 'string' },
          induk: { type: 'string' },
          relasi: { type: 'string', enum: Object.keys(RELATION_BY_WORD) },
        },
        required: ['jenis', 'tipe', 'judul', 'sasaran', 'induk'],
      },
    },
  },
  required: ['operasi'],
} as const

const STRUCTURE_SYSTEM = [
  'Kamu penyusun struktur untuk papan kerja rapat berbahasa Indonesia.',
  'Ubah ucapan menjadi daftar operasi kecil atas outline yang diberikan.',
  'Ucapan bisa Bahasa Indonesia atau English. Judul simpul baru ditulis dalam bahasa ucapan; nilai jenis, tipe, dan relasi tetap dari daftar.',
  '',
  'Aturan:',
  '- "tambah": judul = isi simpul baru (maks 60 karakter), induk = judul simpul induk persis dari outline, atau "" untuk simpul terfokus.',
  '- "ubah_judul": sasaran = judul lama persis dari outline, judul = judul baru.',
  '- "pindah": sasaran = judul simpul yang dipindah, induk = judul induk baru.',
  '- "hapus": sasaran = judul simpul yang dihapus.',
  '- "hubung": sasaran = judul simpul asal, induk = judul simpul tujuan, relasi = jenis hubungannya.',
  '- Sebut simpul yang sudah ada HANYA dengan judul yang tertulis di outline.',
  '- Kalau ucapan bukan perintah menyusun, kembalikan operasi kosong.',
  '- "tipe" wajib diisi. Jangan menaruh jenis simpul di dalam judul (salah: "Langkah: Uji jaringan").',
  '- JANGAN menerjemahkan judul. Ucapan English menghasilkan judul English.',
  '- Kalau pembicara mengoreksi diri ("eh maksudnya", "I mean"), pakai versi terakhir saja.',
].join('\n')

/** Whether a title shares at least one meaningful word with what was said. */
function saidIn(transcript: string, title: string): boolean {
  const said = new Set(normalise(transcript).split(' '))
  return normalise(title)
    .split(' ')
    .some((word) => word.length >= 4 && said.has(word))
}

interface StructureAnswer {
  operasi: {
    jenis: 'tambah' | 'ubah_judul' | 'pindah' | 'hapus' | 'hubung'
    tipe?: string
    judul: string
    sasaran: string
    induk: string
    relasi?: string
  }[]
}

/**
 * The structure stage on the model. Same contract as the rule version: the
 * model names nodes by title, the code resolves titles to ids, and a title the
 * code cannot find drops the operation rather than inventing a node.
 */
export async function structureWithOllama(input: StructureInput): Promise<StructureResult> {
  const tree = projectTree(input.doc)
  const context = buildContext(input.doc, tree, input.focusId)
  const response = await fetch(`${ENDPOINT}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      format: STRUCTURE_SCHEMA,
      options: { temperature: 0.1 },
      messages: [
        { role: 'system', content: STRUCTURE_SYSTEM },
        {
          role: 'user',
          content: `Konteks ruang:\n${renderContext(context)}\n\nUcapan: "${input.transcript}"`,
        },
      ],
    }),
  })
  if (!response.ok) throw new Error(`Ollama menjawab ${response.status}`)
  const payload = (await response.json()) as { message?: { content?: string } }
  const answer = JSON.parse(payload.message?.content ?? '{}') as StructureAnswer

  const title = (id: NodeId | null) => (id ? input.doc.nodes[id]?.title ?? 'simpul' : 'ruang')
  const steps: PlanStep[] = []
  for (const op of answer.operasi ?? []) {
    /*
      Grounding check, in code. The probe caught the model answering "delete
      anggaran laboratorium" with a different, real node -- a title that exists
      in the outline, so the resolver happily found it. A node the speaker never
      named cannot be the target of a change, so every existing node the model
      points at must share a real word with what was actually said.
    */
    const grounded = (hit: { id: NodeId; score: number } | null) =>
      hit && saidIn(input.transcript, input.doc.nodes[hit.id]?.title ?? '') ? hit : null
    const target = op.sasaran ? grounded(findNodeByTitle(input.doc, op.sasaran)) : null
    const parent = op.induk ? grounded(findNodeByTitle(input.doc, op.induk)) : null
    // A model that names a node the outline does not have is guessing. Lower the
    // confidence so the panel marks it, never higher than the rule version would.
    const sure = (hit: { score: number } | null) => (hit && hit.score >= 0.75 ? 0.85 : 0.55)

    if (op.jenis === 'tambah' && op.judul.trim()) {
      const kind = KIND_BY_WORD[op.tipe ?? ''] ?? 'idea'
      const parentId = parent?.id ?? input.focusId
      const tidy = tidyTitle(op.judul)
      steps.push({
        agent: tidy.note ? 'perapi' : 'penyusun',
        preview: `Tambah ${KIND_LABEL[kind]} "${tidy.title}" di bawah ${title(parentId)}.`,
        confidence: op.induk ? sure(parent) : 0.8,
        commands: [
          { type: 'createNode', parentId, kind, title: tidy.title, ...(tidy.note ? { note: tidy.note } : {}) },
        ],
      })
    } else if (op.jenis === 'ubah_judul' && target && op.judul.trim()) {
      const tidy = tidyTitle(op.judul)
      steps.push({
        agent: 'penyusun',
        preview: `Ganti judul "${title(target.id)}" menjadi "${tidy.title}".`,
        confidence: sure(target),
        commands: [{ type: 'renameNode', id: target.id, title: tidy.title }],
      })
    } else if (op.jenis === 'pindah' && target && parent && target.id !== parent.id) {
      steps.push({
        agent: 'penyusun',
        preview: `Pindahkan "${title(target.id)}" ke bawah "${title(parent.id)}".`,
        confidence: Math.min(sure(target), sure(parent)),
        commands: [{ type: 'moveNode', id: target.id, parentId: parent.id }],
      })
    } else if (op.jenis === 'hapus' && target) {
      steps.push({
        agent: 'penyusun',
        preview: `Hapus "${title(target.id)}". Anak-anaknya naik satu tingkat.`,
        confidence: Math.min(sure(target), 0.8),
        commands: [{ type: 'deleteNode', id: target.id, mode: 'promote' }],
      })
    } else if (op.jenis === 'hubung' && target && parent && target.id !== parent.id) {
      const kind = RELATION_BY_WORD[op.relasi ?? ''] ?? 'refers_to'
      steps.push({
        agent: 'penyusun',
        preview: `Hubungkan "${title(target.id)}" ${RELATION_LABEL[kind]} "${title(parent.id)}".`,
        confidence: Math.min(sure(target), sure(parent)),
        commands: [{ type: 'addRelation', fromId: target.id, toId: parent.id, kind }],
      })
    }
  }
  return steps.length > 0 ? { steps } : { steps: [], rawText: input.transcript }
}

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
      reason: tr('Dua alat disebut dalam satu kalimat, jadi ini tidak ditebak.', 'Two tools were named in one sentence, so this is not guessed.'),
      steps: [],
      question: {
        question: tr(`Yang mana dulu: ${choices.map((c) => c.label).join(' atau ')}?`, `Which one first: ${choices.map((c) => c.label).join(' or ')}?`),
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
          question: tr(`Yang mana dulu: ${choices.map((c) => c.label).join(' atau ')}?`, `Which one first: ${choices.map((c) => c.label).join(' or ')}?`),
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
        reason: `${fromRules.reason} ${tr(`(Model menjawab "${answer.rute}"; namanya tetap disebut, jadi aturan yang dipakai.)`, `(The model answered "${answer.rute}"; the name was still said, so the rule wins.)`)}`,
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
