/**
 * The structure stage: ordinary sentences into ordinary commands.
 *
 * Runs only after the orchestrator has decided nobody asked for a tool. Reads a
 * small, fixed set of sentence shapes -- add, add several, rename, move,
 * delete, relate -- in Indonesian and in English, and resolves every node it
 * names by title against the document. A title that cannot be found is never
 * guessed into existence on a shared canvas (section 8): the step is marked as
 * needing a look, or the words come back as editable text.
 *
 * The title tidier lives here too. Speech is longer than typing, and a spoken
 * sentence that breaks rule 4 should be shortened with the rest kept as a note
 * (D1), not rejected and made to be said again.
 *
 * New titles keep the language they were spoken in. Only the proposal sentence
 * around them follows the output language.
 */

import type { Command } from '../commands/types'
import type { NodeId, NodeKind, RelationKind, RoomDoc } from '../model/types'
import { TITLE_MAX } from '../rules/invariants'
import { KIND_LABEL, RELATION_LABEL } from '../../ui/labels'
import { tr } from '../../i18n/lang'
import type { PlanStep } from './types'

export interface StructureInput {
  transcript: string
  doc: RoomDoc
  focusId: NodeId | null
}

export interface StructureResult {
  steps: PlanStep[]
  /** Set when nothing could be read. Shown as editable text, never applied silently. */
  rawText?: string
}

const KIND_WORDS: Record<string, NodeKind> = {
  gagasan: 'idea',
  ide: 'idea',
  idea: 'idea',
  langkah: 'step',
  tahap: 'step',
  step: 'step',
  keputusan: 'decision',
  decision: 'decision',
  pertanyaan: 'question',
  question: 'question',
  fakta: 'fact',
  data: 'fact',
  catatan: 'fact',
  fact: 'fact',
  note: 'fact',
  tindakan: 'action',
  tugas: 'action',
  aksi: 'action',
  action: 'action',
  task: 'action',
  kelompok: 'group',
  grup: 'group',
  kategori: 'group',
  group: 'group',
  category: 'group',
}
// English plurals, so "add three steps" reads as steps.
for (const word of ['idea', 'step', 'decision', 'question', 'fact', 'note', 'action', 'task', 'group']) {
  KIND_WORDS[`${word}s`] = KIND_WORDS[word]
}
KIND_WORDS.categories = 'group'

const RELATION_WORDS: [string, RelationKind][] = [
  ['bergantung pada', 'depends_on'],
  ['tergantung pada', 'depends_on'],
  ['menyebabkan', 'causes'],
  ['bertentangan dengan', 'contradicts'],
  ['merujuk ke', 'refers_to'],
  ['dilanjutkan oleh', 'sequence'],
  ['depends on', 'depends_on'],
  ['causes', 'causes'],
  ['contradicts', 'contradicts'],
  ['refers to', 'refers_to'],
  ['is followed by', 'sequence'],
]

const COUNT_WORDS = new Set([
  'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'sebuah', 'beberapa',
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'a', 'an', 'some', 'several',
])
const LIST_COUNTS = new Set([
  'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'beberapa',
  'two', 'three', 'four', 'five', 'six', 'seven', 'some', 'several',
])
const ADD_VERBS = [
  'tambahkan', 'tambah', 'buatkan', 'buat', 'bikin', 'catat', 'masukkan', 'tulis',
  'add', 'create', 'make', 'write', 'note down', 'put',
]
const FILLERS = [
  'baru', 'yaitu', 'yakni', 'bernama', 'berjudul', 'tentang', 'bahwa',
  'new', 'called', 'named', 'about', 'that', 'saying',
]
const POLITE = String.raw`(?:tolong\s+|please\s+|can you\s+|could you\s+)?`

export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:"“”]/g, ' ')
    // Recognisers write these joined as often as apart.
    .replace(/\b(di|ke)(bawah|dalam)\b/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
}

function capitalise(text: string): string {
  const trimmed = text.trim()
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

/**
 * Best node for a spoken name, or null. Exact beats contains beats shared
 * words, and shared words need most of the name to be present -- "uji" alone
 * is not a reference to "Uji coba satu kelas".
 */
export function findNodeByTitle(doc: RoomDoc, spoken: string): { id: NodeId; score: number } | null {
  const needle = normalise(spoken)
    .replace(/^(?:the\s+)?(?:simpul|kartu|node|card)\s+/, '')
    .replace(/^the\s+/, '')
  if (!needle) return null
  const words = needle.split(' ')
  let best: { id: NodeId; score: number } | null = null
  for (const node of Object.values(doc.nodes)) {
    const title = normalise(node.title)
    let score = 0
    if (title === needle) score = 1
    else if (title.includes(needle) && needle.length >= 4) score = 0.85
    else if (needle.includes(title) && title.length >= 4) score = 0.75
    else {
      const have = new Set(title.split(' '))
      const shared = words.filter((w) => have.has(w)).length
      const ratio = shared / Math.max(words.length, have.size)
      if (ratio >= 0.6) score = 0.5 + ratio * 0.2
    }
    if (score > 0 && (!best || score > best.score)) best = { id: node.id, score }
  }
  return best
}

/** Rule 4 without throwing information away: shorten, keep the rest as a note. */
export function tidyTitle(raw: string): { title: string; note?: string } {
  const text = capitalise(raw)
  if (text.length <= TITLE_MAX) return { title: text }
  const cuts = [
    ', ', ' karena ', ' supaya ', ' agar ', ' sehingga ', ' yang ', ' untuk ', ' dengan ',
    ' because ', ' so that ', ' which ', ' that ', ' for ', ' with ',
  ]
  for (const cut of cuts) {
    const at = text.indexOf(cut)
    if (at >= 8 && at <= TITLE_MAX) {
      return { title: text.slice(0, at).trim(), note: text.trim() }
    }
  }
  const space = text.lastIndexOf(' ', TITLE_MAX)
  const at = space > 8 ? space : TITLE_MAX
  return { title: text.slice(0, at).trim(), note: text.trim() }
}

function titleOf(doc: RoomDoc, id: NodeId | null): string {
  return id ? doc.nodes[id]?.title ?? tr('simpul', 'node') : tr('ruang', 'the room')
}

function splitItems(text: string): string[] {
  return text
    .split(/\s*(?:\blalu\b|\bkemudian\b|\bdan\b|\bserta\b|\band then\b|\bthen\b|\band\b|\bafter that\b)\s*/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

const one = (step: PlanStep): StructureResult => ({ steps: [step] })

function addSteps(body: string, input: StructureInput): StructureResult | null {
  let rest = body
  let parentId = input.focusId
  let parentNote = ''
  let confidence = 0.88

  const under = rest.match(
    /^(.*?)\s+(?:di bawah|ke bawah|di dalam|ke dalam|untuk bagian|under|below|inside|into|beneath)\s+(.+)$/,
  )
  if (under) {
    rest = under[1]
    const hit = findNodeByTitle(input.doc, under[2])
    if (hit) {
      parentId = hit.id
      confidence = hit.score >= 0.75 ? 0.9 : 0.62
    } else {
      confidence = 0.5
      parentNote = tr(
        ` "${under[2]}" tidak ditemukan, jadi ditaruh di bawah ${titleOf(input.doc, parentId)}.`,
        ` "${under[2]}" was not found, so it goes under ${titleOf(input.doc, parentId)}.`,
      )
    }
  }

  const words = rest.split(' ')
  const listedByCount = LIST_COUNTS.has(words[0]) || /^\d+$/.test(words[0] ?? '')
  while (words.length > 0 && (COUNT_WORDS.has(words[0]) || /^\d+$/.test(words[0]))) words.shift()
  let kind: NodeKind = 'idea'
  if (words.length > 0 && KIND_WORDS[words[0]]) kind = KIND_WORDS[words.shift() as string]
  while (words.length > 0 && FILLERS.includes(words[0])) words.shift()
  const content = words.join(' ').trim()
  if (!content) return null

  // "tiga langkah siapkan ruang lalu uji jaringan" is several nodes; a single
  // idea with "dan" in it usually is not, so only split when a list was signalled.
  const listed = listedByCount || /\b(lalu|kemudian|then|after that)\b/.test(content)
  const items = listed ? splitItems(content) : [content]

  return {
    steps: items.map((item) => {
      const tidy = tidyTitle(item)
      const command: Command = {
        type: 'createNode',
        parentId,
        kind,
        title: tidy.title,
        ...(tidy.note ? { note: tidy.note } : {}),
      }
      const where = titleOf(input.doc, parentId)
      return {
        agent: tidy.note ? 'perapi' : 'penyusun',
        preview:
          tr(
            `Tambah ${KIND_LABEL[kind]} "${tidy.title}" di bawah ${where}.`,
            `Add ${KIND_LABEL[kind]} "${tidy.title}" under ${where}.`,
          ) +
          (tidy.note
            ? tr(' Judul dipendekkan; kalimat utuhnya jadi catatan.', ' Title shortened; the full sentence becomes a note.')
            : '') +
          parentNote,
        confidence: tidy.note ? Math.min(confidence, 0.7) : confidence,
        commands: [command],
      }
    }),
  }
}

export function structure(input: StructureInput): StructureResult {
  const text = normalise(input.transcript)
  const { doc } = input
  if (!text) return { steps: [], rawText: input.transcript }
  const sure = (score: number, high: number, low: number) => (score >= 0.75 ? high : low)

  // Delete. Always a step to review; the gate is what makes it safe (rule 8).
  const del = text.match(new RegExp(`^${POLITE}(?:hapus|hapuskan|buang|delete|remove)\\s+(.+)$`))
  if (del) {
    const hit = findNodeByTitle(doc, del[1])
    if (hit) {
      return one({
        agent: 'penyusun',
        preview: tr(
          `Hapus "${titleOf(doc, hit.id)}". Anak-anaknya naik satu tingkat.`,
          `Delete "${titleOf(doc, hit.id)}". Its children move up one level.`,
        ),
        confidence: sure(hit.score, 0.82, 0.55),
        commands: [{ type: 'deleteNode', id: hit.id, mode: 'promote' }],
      })
    }
  }

  // Rename.
  const rename = text.match(
    new RegExp(
      `^${POLITE}(?:ganti|ubah|rename|change)\\s+(?:judul\\s+|nama\\s+|the title of\\s+|title of\\s+)?(.+?)\\s+(?:jadi|menjadi|to|into)\\s+(.+)$`,
    ),
  )
  if (rename) {
    const hit = findNodeByTitle(doc, rename[1])
    if (hit) {
      const tidy = tidyTitle(rename[2])
      return one({
        agent: 'penyusun',
        preview: tr(
          `Ganti judul "${titleOf(doc, hit.id)}" menjadi "${tidy.title}".`,
          `Rename "${titleOf(doc, hit.id)}" to "${tidy.title}".`,
        ),
        confidence: sure(hit.score, 0.88, 0.58),
        commands: [{ type: 'renameNode', id: hit.id, title: tidy.title }],
      })
    }
  }

  // Move.
  const move = text.match(
    new RegExp(`^${POLITE}(?:pindahkan|pindah|move)\\s+(.+?)\\s+(?:ke bawah|ke dalam|ke|under|into|to)\\s+(.+)$`),
  )
  if (move) {
    const what = findNodeByTitle(doc, move[1])
    const where = findNodeByTitle(doc, move[2])
    if (what && where && what.id !== where.id) {
      return one({
        agent: 'penyusun',
        preview: tr(
          `Pindahkan "${titleOf(doc, what.id)}" ke bawah "${titleOf(doc, where.id)}".`,
          `Move "${titleOf(doc, what.id)}" under "${titleOf(doc, where.id)}".`,
        ),
        confidence: sure(Math.min(what.score, where.score), 0.85, 0.55),
        commands: [{ type: 'moveNode', id: what.id, parentId: where.id }],
      })
    }
  }

  // Relate: "A bergantung pada B", "connect A with B".
  const link = text.match(
    new RegExp(`^${POLITE}(?:hubungkan|sambungkan|connect|link)\\s+(.+?)\\s+(?:dengan|ke|with|to|and)\\s+(.+)$`),
  )
  const related = link
    ? ([link[1], 'refers_to', link[2]] as const)
    : (() => {
        for (const [phrase, kind] of RELATION_WORDS) {
          const at = text.indexOf(` ${phrase} `)
          if (at > 0) return [text.slice(0, at), kind, text.slice(at + phrase.length + 2)] as const
        }
        return null
      })()
  if (related) {
    const from = findNodeByTitle(doc, related[0])
    const to = findNodeByTitle(doc, related[2])
    if (from && to && from.id !== to.id) {
      const rel = RELATION_LABEL[related[1]]
      return one({
        agent: 'penyusun',
        preview: tr(
          `Hubungkan "${titleOf(doc, from.id)}" ${rel} "${titleOf(doc, to.id)}".`,
          `Link "${titleOf(doc, from.id)}", ${rel} "${titleOf(doc, to.id)}".`,
        ),
        confidence: sure(Math.min(from.score, to.score), 0.86, 0.56),
        commands: [{ type: 'addRelation', fromId: from.id, toId: to.id, kind: related[1] }],
      })
    }
  }

  // Add.
  const polite = text.replace(/^(?:tolong|please|can you|could you|let's|lets)\s+/, '')
  const verb = ADD_VERBS.find((v) => polite.startsWith(`${v} `))
  if (verb) {
    const added = addSteps(polite.slice(verb.length + 1), input)
    if (added && added.steps.length > 0) return added
  }

  // A bare kind word at the start reads as an add too: "pertanyaan siapa yang mengajar".
  const first = text.split(' ')[0]
  if (KIND_WORDS[first] && text.split(' ').length > 1) {
    const added = addSteps(text, input)
    if (added && added.steps.length > 0) {
      return { steps: added.steps.map((s) => ({ ...s, confidence: Math.min(s.confidence, 0.7) })) }
    }
  }

  return { steps: [], rawText: input.transcript }
}
