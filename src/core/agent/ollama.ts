/**
 * The local model as the orchestrator, behind the same seam as the rules.
 *
 * One call decides everything a sentence can mean: a tool, ordinary structure,
 * a question back to the speaker, or not a command at all. It used to be two
 * calls -- route, then structure -- and the probe of real phrasings showed the
 * rules in front of the model understood 6 of 26 ways people actually talk.
 * Keyword matching is not a floor anyone can stand on; it is now only a brake
 * and a fallback.
 *
 * What stays in code, because a 7B model cannot be trusted with it:
 *
 * 1. **Constrained decoding with a JSON schema** (section 8).
 * 2. **The model names nodes by title, never by id**, and code resolves them.
 * 3. **Grounding.** Every existing node a direct change points at must share a
 *    real word with what was said. The probe caught the model proposing to
 *    delete a node nobody named.
 * 4. **The two-tools brake** runs before the model is asked (D64).
 *
 * When the sentence is unclear the model asks, with options that each carry
 * their own operations. Options are not grounded -- the person picks one
 * explicitly, which is the confirmation -- but every option must still resolve
 * to real nodes or it is dropped.
 */

import { expandTemplate, templateSize } from '../templates/expand'
import { templateById, TEMPLATES } from '../templates/registry'
import { buildContext, renderContext } from './context'
import { namedIn, plan } from './orchestrator'
import type { Plan, PlanQuestion, PlanStep } from './types'
import type { PlanInput } from './provider'
import { findNodeByTitle, normalise, tidyTitle } from './structure'
import type { Command } from '../commands/types'
import type { NodeId, NodeKind, RelationKind } from '../model/types'
import { KIND_LABEL, RELATION_LABEL } from '../vocabulary'
import { lang, tr } from '../i18n'
import { isMixedContent, ollamaModel, ollamaUrl } from '../config'

/*
  Address and model name are configuration, not constants. A deployed copy is
  served from a server while the model stays on each listener's own machine, so
  both must be changeable without a rebuild: .env at build time, Settings per
  device (src/config.ts).
*/
const ENDPOINT = () => ollamaUrl()
const MODEL = () => ollamaModel()

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

// 'none' first: a required enum gets filled with its first value when the
// model has nothing to say, and that used to be 'voting'.
const TEMPLATE_IDS = ['none', ...TEMPLATES.map((t) => t.id)]

const OP_SCHEMA = {
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
} as const

/** Everything is required, so the shape never wanders; empty is a valid value. */
const SCHEMA = {
  type: 'object',
  properties: {
    maksud: { type: 'string', enum: ['alat', 'susun', 'tanya', 'tak-dikenali'] },
    templat: { type: 'string', enum: TEMPLATE_IDS },
    disebut_langsung: { type: 'boolean' },
    judul_alat: { type: 'string' },
    operasi: { type: 'array', maxItems: 6, items: OP_SCHEMA },
    pertanyaan: { type: 'string' },
    /*
      Flat on purpose: one option, one operation. Nested operation lists inside
      options came back empty every time from a 7B model, which silently threw
      every option away.
    */
    opsi: {
      type: 'array',
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          templat: { type: 'string', enum: TEMPLATE_IDS },
          ...OP_SCHEMA.properties,
        },
        required: ['label', 'templat', 'jenis', 'tipe', 'judul', 'sasaran', 'induk'],
      },
    },
    alasan: { type: 'string' },
  },
  required: ['maksud', 'templat', 'disebut_langsung', 'judul_alat', 'operasi', 'pertanyaan', 'opsi', 'alasan'],
} as const

interface ModelOp {
  jenis: 'tambah' | 'ubah_judul' | 'pindah' | 'hapus' | 'hubung'
  tipe?: string
  judul: string
  sasaran: string
  induk: string
  relasi?: string
}

interface ModelAnswer {
  maksud: 'alat' | 'susun' | 'tanya' | 'tak-dikenali'
  templat: string
  disebut_langsung: boolean
  judul_alat: string
  operasi: ModelOp[]
  pertanyaan: string
  opsi: (ModelOp & { label: string; templat: string })[]
  alasan: string
}

function systemPrompt(): string {
  const out = lang() === 'en' ? 'English' : 'Bahasa Indonesia'
  return [
    'Kamu orchestrator papan kerja rapat. Ucapan pengguna bisa Bahasa Indonesia, English, campuran, santai, bertele-tele, atau salah dengar dari pengenal suara.',
    'Pahami MAKSUDNYA, bukan kata kuncinya. Pilih satu "maksud":',
    '',
    '- "alat": pengguna meminta templat rapat (disebut, atau maksudnya jelas). Isi "templat", "disebut_langsung", dan "judul_alat" (boleh kosong).',
    '- "susun": perintah yang JELAS untuk menambah, mengubah judul, memindah, menghapus, atau menghubungkan simpul. Isi "operasi".',
    '- Permintaan yang jelas TIDAK boleh dijawab dengan pertanyaan. Bertanya itu ongkos bagi semua orang di rapat; pakai hanya kalau benar-benar ada lebih dari satu arti yang masuk akal.',
    '- "tanya": maksudnya belum jelas. Contoh: "yang ini"/"yang tadi"/"itu" yang bisa merujuk lebih dari satu simpul; simpul yang disebut tidak ada di outline atau cocok ke beberapa; pernyataan yang MUNGKIN ingin dicatat ("menurut saya kita perlu X"); permintaan yang bisa berarti beberapa hal. Isi "pertanyaan" (satu kalimat pendek) dan 2-3 "opsi". SETIAP opsi WAJIB berisi satu operasi lengkap (jenis, tipe, judul, sasaran, induk) atau satu templat, yang dijalankan kalau opsi itu dipilih. Jangan buat opsi "tidak" atau "batal"; pengguna selalu bisa menolak sendiri. Label opsi pendek.',
    '- "tak-dikenali": obrolan yang jelas bukan untuk papan (salam, cuaca, basa-basi).',
    '',
    'Aturan operasi:',
    '- "tambah": judul = isi simpul baru (maks 60 karakter), induk = judul simpul induk persis dari outline, atau "" untuk simpul terfokus. "tipe" wajib.',
    '- "ubah_judul": sasaran = judul lama persis, judul = judul baru. "pindah": sasaran = simpul yang dipindah, induk = induk baru. "hapus": sasaran = simpul yang dihapus. "hubung": sasaran = asal, induk = tujuan, relasi = jenisnya.',
    '- Sebut simpul yang sudah ada HANYA dengan judul yang tertulis di outline. Jangan mengarang.',
    '- JANGAN menebak hapus atau pindah. Kalau sasarannya tidak pasti, maksud = "tanya".',
    '- "yang tadi"/"barusan" merujuk ke daftar "baru saja"; "yang ini" merujuk ke "fokus". Kalau tetap tidak pasti, tanya.',
    '- JANGAN menerjemahkan judul simpul. Jangan menaruh jenis simpul di dalam judul.',
    '- Kalau pembicara mengoreksi diri ("eh maksudnya", "I mean"), pakai versi terakhir.',
    '- Buang kata pengisi ("eh", "hmm", "dong", "ya", "please").',
    `- "pertanyaan", "label", dan "alasan" ditulis dalam ${out}.`,
    '- Kosongkan field yang tidak dipakai: operasi [], opsi [], pertanyaan "", templat "none". "alasan" selalu diisi satu kalimat.',
    '',
    'Contoh singkat:',
    '"eh tambahin dong pelatihan dosen" -> susun, operasi [tambah gagasan "Pelatihan dosen"]',
    '"which is more important, high impact or low effort" -> alat, templat matriks, disebut_langsung false',
    '"kenapa bisa angka putus kuliah naik" -> alat, templat lima_kenapa, disebut_langsung false',
    '"hapus yang itu" dengan fokus tidak jelas -> tanya "Simpul mana yang dihapus?", opsi: {label "Kirim draf", jenis hapus, sasaran "Kirim draf ke ketua program studi"}, {label "Hubungi vendor", jenis hapus, sasaran "Hubungi vendor perangkat braille"}',
    '"menurut saya kita perlu pelatihan dosen dulu" -> tanya "Mau dicatat?", opsi: {label "Sebagai gagasan", jenis tambah, tipe gagasan, judul "Pelatihan dosen"}, {label "Sebagai keputusan", jenis tambah, tipe keputusan, judul "Pelatihan dosen dulu"}',
  ].join('\n')
}

export async function probeOllama(): Promise<{ ready: boolean; detail: string }> {
  const url = ollamaUrl()
  const model = ollamaModel()
  if (isMixedContent(url)) {
    return {
      ready: false,
      detail: tr(
        `Halaman ini https, tapi ${url} http. Peramban memblokirnya kecuali alamatnya localhost.`,
        `This page is https but ${url} is http. Browsers block that unless the address is localhost.`,
      ),
    }
  }
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2000)
    const response = await fetch(`${url}/api/tags`, { signal: controller.signal })
    clearTimeout(timer)
    if (response.status === 403) {
      return {
        ready: false,
        detail: tr(
          `Ollama menolak asal halaman ini. Jalankan ulang dengan OLLAMA_ORIGINS=${globalThis.location?.origin ?? '*'}`,
          `Ollama refused this page's origin. Restart it with OLLAMA_ORIGINS=${globalThis.location?.origin ?? '*'}`,
        ),
      }
    }
    if (!response.ok) return { ready: false, detail: `Ollama ${response.status}.` }
    const body = (await response.json()) as { models?: { name: string }[] }
    const names = (body.models ?? []).map((m) => m.name)
    if (!names.includes(model)) {
      return {
        ready: false,
        detail: tr(
          `Ollama jalan, tapi ${model} belum diunduh. Jalankan: ollama pull ${model}`,
          `Ollama is running, but ${model} is not pulled. Run: ollama pull ${model}`,
        ),
      }
    }
    return { ready: true, detail: tr(`${model}, lewat ${url}.`, `${model}, via ${url}.`) }
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === 'AbortError'
    return {
      ready: false,
      detail: aborted
        ? tr(`${url} tidak menjawab dalam 2 detik.`, `${url} did not answer within 2 seconds.`)
        : tr(
            `${url} tidak terjangkau. Pastikan Ollama jalan, dan bila halaman ini dari server, izinkan asalnya lewat OLLAMA_ORIGINS.`,
            `${url} is unreachable. Make sure Ollama is running, and if this page came from a server, allow its origin with OLLAMA_ORIGINS.`,
          ),
    }
  }
}

/** Whether a title shares at least one meaningful word with what was said. */
function saidIn(said: string, title: string): boolean {
  const words = new Set(normalise(said).split(' '))
  return normalise(title)
    .split(' ')
    .some((word) => word.length >= 4 && words.has(word))
}

/**
 * Model operations into plan steps. `groundIn` set means direct changes: every
 * existing node must have been said. Unset means options the person will pick
 * explicitly.
 */
function buildSteps(ops: ModelOp[], input: PlanInput, groundIn: string | null): PlanStep[] {
  const { doc } = input
  const title = (id: NodeId | null) => (id ? doc.nodes[id]?.title ?? tr('simpul', 'node') : tr('ruang', 'the room'))
  const resolve = (spoken: string) => {
    const hit = spoken ? findNodeByTitle(doc, spoken) : null
    if (!hit) return null
    if (groundIn !== null && !saidIn(groundIn, doc.nodes[hit.id]?.title ?? '')) return null
    return hit
  }
  const sure = (hit: { score: number } | null) => (hit && hit.score >= 0.75 ? 0.85 : 0.55)
  const steps: PlanStep[] = []

  for (const op of ops ?? []) {
    const target = resolve(op.sasaran)
    const parent = resolve(op.induk)

    if (op.jenis === 'tambah' && op.judul.trim()) {
      const kind = KIND_BY_WORD[op.tipe ?? ''] ?? 'idea'
      // A parent that was named but not found is not silently swapped for the
      // focus on a direct change; it is dropped so the caller can ask.
      if (op.induk && !parent && groundIn !== null) continue
      const parentId = parent?.id ?? input.focusId
      const tidy = tidyTitle(op.judul)
      const command: Command = {
        type: 'createNode',
        parentId,
        kind,
        title: tidy.title,
        ...(tidy.note ? { note: tidy.note } : {}),
      }
      steps.push({
        agent: tidy.note ? 'perapi' : 'penyusun',
        preview: tr(
          `Tambah ${KIND_LABEL[kind]} "${tidy.title}" di bawah ${title(parentId)}.`,
          `Add ${KIND_LABEL[kind]} "${tidy.title}" under ${title(parentId)}.`,
        ),
        confidence: op.induk ? sure(parent) : 0.8,
        commands: [command],
      })
    } else if (op.jenis === 'ubah_judul' && target && op.judul.trim()) {
      const tidy = tidyTitle(op.judul)
      steps.push({
        agent: 'penyusun',
        preview: tr(
          `Ganti judul "${title(target.id)}" menjadi "${tidy.title}".`,
          `Rename "${title(target.id)}" to "${tidy.title}".`,
        ),
        confidence: sure(target),
        commands: [{ type: 'renameNode', id: target.id, title: tidy.title }],
      })
    } else if (op.jenis === 'pindah' && target && parent && target.id !== parent.id) {
      steps.push({
        agent: 'penyusun',
        preview: tr(
          `Pindahkan "${title(target.id)}" ke bawah "${title(parent.id)}".`,
          `Move "${title(target.id)}" under "${title(parent.id)}".`,
        ),
        confidence: Math.min(sure(target), sure(parent)),
        commands: [{ type: 'moveNode', id: target.id, parentId: parent.id }],
      })
    } else if (op.jenis === 'hapus' && target) {
      steps.push({
        agent: 'penyusun',
        preview: tr(
          `Hapus "${title(target.id)}". Anak-anaknya naik satu tingkat.`,
          `Delete "${title(target.id)}". Its children move up one level.`,
        ),
        confidence: Math.min(sure(target), 0.8),
        commands: [{ type: 'deleteNode', id: target.id, mode: 'promote' }],
      })
    } else if (op.jenis === 'hubung' && target && parent && target.id !== parent.id) {
      const kind = RELATION_BY_WORD[op.relasi ?? ''] ?? 'refers_to'
      steps.push({
        agent: 'penyusun',
        preview: tr(
          `Hubungkan "${title(target.id)}" ${RELATION_LABEL[kind]} "${title(parent.id)}".`,
          `Link "${title(target.id)}", ${RELATION_LABEL[kind]} "${title(parent.id)}".`,
        ),
        confidence: Math.min(sure(target), sure(parent)),
        commands: [{ type: 'addRelation', fromId: target.id, toId: parent.id, kind }],
      })
    }
  }
  return steps
}

function templateStep(templateId: string, retitle: string, named: boolean, input: PlanInput): PlanStep | null {
  const spec = templateById(templateId)
  if (!spec) return null
  const built = spec.build()
  // The model may retitle the container. It may not restructure it: the shape
  // of a retro board is not a thing worth letting a 7B model improvise.
  const root = retitle.trim() ? { ...built, title: retitle.trim().slice(0, 60) } : built
  return {
    agent: 'pemilih',
    preview: tr(
      `Siapkan ${spec.label.toLowerCase()}: ${templateSize(root)} simpul.`,
      `Set up ${spec.label.toLowerCase()}: ${templateSize(root)} nodes.`,
    ),
    confidence: named ? 0.92 : 0.6,
    commands: expandTemplate(root, input.focusId),
    source: { kind: spec.id === 'voting' ? 'alat' : 'templat', id: spec.id, label: spec.label },
  }
}

/** The node a question option is about, so the agent cursor can stand on it. */
function targetOf(commands: Command[]): NodeId | undefined {
  for (const c of commands) {
    if ('id' in c && typeof c.id === 'string' && c.type !== 'createNode') return c.id
    if (c.type === 'createNode' && c.parentId) return c.parentId
    if (c.type === 'addRelation') return c.fromId
  }
  return undefined
}

function twoToolsQuestion(named: string[], input: PlanInput): Plan {
  const choices = named
    .map((id) => templateById(id))
    .filter((spec): spec is NonNullable<typeof spec> => Boolean(spec))
    .map((spec) => ({ id: spec.id, label: spec.label, commands: expandTemplate(spec.build(), input.focusId) }))
  return {
    intent: 'ambigu',
    reason: tr('Dua alat disebut dalam satu kalimat, jadi ini tidak ditebak.', 'Two tools were named in one sentence, so this is not guessed.'),
    steps: [],
    question: {
      question: tr(
        `Yang mana dulu: ${choices.map((c) => c.label).join(' atau ')}?`,
        `Which one first: ${choices.map((c) => c.label).join(' or ')}?`,
      ),
      choices,
    },
  }
}

export async function planWithOllama(input: PlanInput): Promise<Plan> {
  // The brake is code, not prompt (D64).
  const named = namedIn(input.transcript)
  if (named.length > 1) return twoToolsQuestion(named, input)

  /*
    A tool named after a request word is not a judgement call, and the eval
    showed the model answering those with a question 7 times out of 7. Asking
    someone who just said "bikin voting" whether they meant voting is the
    opposite of understanding them, so this one is settled before the model.
    It is also three seconds faster.
  */
  if (!input.pending) {
    const ruled = plan(input)
    if (ruled.intent === 'alat-diminta') return ruled
  }

  const context = renderContext(buildContext(input.doc, input.tree, input.focusId))
  const said = input.pending ? `${input.pending.transcript} ${input.transcript}` : input.transcript
  const turn = input.pending
    ? `Ucapan awal: "${input.pending.transcript}"\nKamu bertanya: "${input.pending.question}"\nJawaban pengguna: "${input.transcript}"\nPutuskan lagi berdasarkan jawaban itu.`
    : `Ucapan: "${input.transcript}"`

  const response = await fetch(`${ENDPOINT()}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL(),
      stream: false,
      // Keep the model loaded between sentences in a meeting; reloading it is
      // most of the wait on a cold call.
      keep_alive: '30m',
      format: SCHEMA,
      options: { temperature: 0 },
      messages: [
        { role: 'system', content: systemPrompt() },
        { role: 'user', content: `Konteks ruang:\n${context}\n\n${turn}` },
      ],
    }),
  })
  if (!response.ok) throw new Error(`Ollama ${response.status}`)
  const payload = (await response.json()) as { message?: { content?: string } }
  const answer = JSON.parse(payload.message?.content ?? '{}') as ModelAnswer
  const why = answer.alasan?.trim() || tr('Model memutuskan dari maksud ucapan.', 'The model decided from what the sentence meant.')

  if (answer.maksud === 'alat') {
    const step = templateStep(answer.templat, answer.judul_alat ?? '', answer.disebut_langsung, input)
    const named = namedIn(input.transcript).includes(answer.templat)
    const shaped = plan(input).intent === 'alat-diusulkan'
    if (step && (named || shaped)) {
      return { intent: named && answer.disebut_langsung ? 'alat-diminta' : 'alat-diusulkan', reason: why, steps: [step] }
    }
    /*
      A tool that was neither named nor has the shape of one in the sentence is
      the model reaching. Probes caught it turning "tambahkan ide..." into a
      vote. Reaching is allowed only as a question: the tool is offered, and
      whatever else the model understood stays offered next to it.
    */
    if (step && step.source) {
      const others = buildSteps(answer.operasi, input, said)
      return {
        intent: 'tanya',
        reason: why,
        steps: [],
        question: {
          question: tr(`Mau pakai ${step.source.label.toLowerCase()}?`, `Use ${step.source.label.toLowerCase()}?`),
          choices: [
            { id: step.source.id, label: tr(`Ya, siapkan ${step.source.label.toLowerCase()}`, `Yes, set up ${step.source.label.toLowerCase()}`), commands: step.commands },
            ...others.map((o, i) => ({ id: `isi_${i}`, label: o.preview, commands: o.commands, targetId: targetOf(o.commands) })),
          ],
        },
      }
    }
  }

  if (answer.maksud === 'susun') {
    const steps = buildSteps(answer.operasi, input, said)
    if (steps.length > 0) return { intent: 'susun', reason: why, steps }
    // The model was sure; the code could not ground it. If the sentence has
    // the shape of a tool, that is the better reading; otherwise ask.
    const implied = plan(input)
    if (implied.intent === 'alat-diusulkan') return implied
    return {
      intent: 'tanya',
      reason: tr(
        'Model memahami ini sebagai perintah, tapi simpul yang dituju tidak cocok dengan yang diucapkan.',
        'The model read this as a command, but the node it pointed at does not match what was said.',
      ),
      steps: [],
      question: {
        question: tr('Simpul mana yang dimaksud? Sebutkan judulnya.', 'Which node do you mean? Say its title.'),
        choices: [],
      },
    }
  }

  if (answer.maksud === 'tanya') {
    const choices: PlanQuestion['choices'] = []
    const implied = plan(input)
    const toolAllowed = (id: string) =>
      namedIn(input.transcript).includes(id) || implied.steps[0]?.source?.id === id
    for (const [i, option] of (answer.opsi ?? []).entries()) {
      // A filled-in operation wins over a template: the model fills required
      // fields it has no use for, and an option labelled "as an idea" with a
      // title in it is an idea, whatever its template field says.
      const hasOp = Boolean(option.judul?.trim() || option.sasaran?.trim())
      const spec = !hasOp && option.templat && option.templat !== 'none' ? templateById(option.templat) : null
      // Same rule as the tool route: an option may offer a tool only when the
      // sentence named it or has its shape. "Keputusan" is not a request to vote.
      if (spec && !toolAllowed(spec.id)) continue
      const commands = spec
        ? templateStep(spec.id, '', true, input)?.commands ?? []
        : buildSteps([option], input, null).flatMap((step) => step.commands)
      if (commands.length === 0 || !option.label?.trim()) continue
      const id = spec ? spec.id : `pilihan_${i}`
      if (choices.some((c) => c.id === id)) continue
      // A tool option says it is a tool. The model once labelled a lima-kenapa
      // template "Faktor eksternal", and a label that hides what a click does
      // is the one thing an option must never be.
      const label = spec ? tr(`Pakai alat ${spec.label.toLowerCase()}`, `Use the ${spec.label.toLowerCase()} tool`) : option.label.trim()
      choices.push({ id, label, commands, targetId: targetOf(commands) })
    }
    /*
      The model tends to ask about content where the sentence has the shape of
      a tool ("kenapa bisa...", "apa yang jalan..."). The rules know those
      shapes; when they see one, the tool joins the options rather than being
      lost. The person still decides.
    */
    if (implied.intent === 'alat-diusulkan' && implied.steps[0]?.source) {
      const source = implied.steps[0].source
      if (!choices.some((c) => c.id === source.id)) {
        if (choices.length >= 4) choices.pop()
        choices.unshift({
          id: source.id,
          label: tr(`Pakai alat ${source.label.toLowerCase()}`, `Use the ${source.label.toLowerCase()} tool`),
          commands: implied.steps[0].commands,
        })
      }
    }
    /*
      A question with one real answer is a proposal wearing a question mark.
      "Should I add teacher training?" with the only option "yes, add it" is
      exactly what the proposal card already asks, with Apply and Cancel, so it
      is shown as that instead of costing an extra step.
    */
    if (choices.length === 1) {
      const only = (answer.opsi ?? []).find((o) => o.label.trim() === choices[0].label)
      const step = only && (!only.templat || only.templat === 'none') ? buildSteps([only], input, null)[0] : null
      if (step) return { intent: 'susun', reason: why, steps: [{ ...step, confidence: Math.min(step.confidence, 0.6) }] }
      if (templateById(choices[0].id)) {
        const tool = templateStep(choices[0].id, '', false, input)
        if (tool) return { intent: 'alat-diusulkan', reason: why, steps: [tool] }
      }
    }
    return {
      intent: 'tanya',
      reason: why,
      steps: [],
      question: {
        question: answer.pertanyaan?.trim() || tr('Maksudnya yang mana?', 'Which do you mean?'),
        choices,
      },
    }
  }

  // Not a command. A name that is actually present still wins: a keyword that
  // is there is not a judgement call (rules as the floor, D64).
  if (named.length === 1) {
    const fromRules = plan(input)
    if (fromRules.steps.length > 0) return fromRules
  }
  return { intent: 'tak-dikenali', reason: why, steps: [], rawText: input.transcript }
}
