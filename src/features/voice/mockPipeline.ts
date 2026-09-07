/**
 * Stand-in for the on-device pipeline.
 *
 * The real chain is AudioWorklet -> Silero VAD -> local ASR -> context builder
 * -> Ollama with constrained decoding -> domain validator. None of that exists
 * yet, so this file replays canned utterances with the same timing and, more
 * importantly, the same *shapes of failure*: an ambiguous request that has to
 * ask, and an utterance the parser cannot use at all.
 *
 * Building the interface against only the happy path would produce a panel that
 * has nowhere to put a question.
 */

import { newDraftId } from '../../core/model/ids'
import type { Command } from '../../core/commands/types'
import type { NodeId, RoomDoc } from '../../core/model/types'
import type { Draft, DraftAmbiguity, DraftOperation } from './types'

export interface Utterance {
  transcript: string
  build: (doc: RoomDoc, focusId: NodeId | null) => {
    operations: Omit<DraftOperation, 'id' | 'accepted'>[]
    ambiguities?: Omit<DraftAmbiguity, 'id'>[]
    rawText?: string
  }
}

function findByTitle(doc: RoomDoc, needle: string): NodeId | null {
  const lower = needle.toLowerCase()
  const hit = Object.values(doc.nodes).find((n) => n.title.toLowerCase().includes(lower))
  return hit?.id ?? null
}

function titleOf(doc: RoomDoc, id: NodeId | null): string {
  return id ? doc.nodes[id]?.title ?? 'simpul' : 'akar'
}

export const UTTERANCES: Utterance[] = [
  {
    transcript: 'tambahkan gagasan pelatihan dosen di bawah rancangan mata kuliah',
    build: (doc) => {
      const parent = findByTitle(doc, 'Rancangan mata kuliah')
      return {
        operations: [
          {
            command: { type: 'createNode', parentId: parent, kind: 'idea', title: 'Pelatihan dosen' },
            preview: `Tambah gagasan "Pelatihan dosen" di bawah ${titleOf(doc, parent)}.`,
            confidence: 0.93,
          },
        ],
      }
    },
  },
  {
    transcript: 'buat tiga langkah siapkan ruang lalu pasang perangkat lunak lalu uji jaringan',
    build: (doc, focusId) => {
      const parent = findByTitle(doc, 'Rencana pelaksanaan') ?? focusId
      const titles = ['Siapkan ruang', 'Pasang perangkat lunak', 'Uji jaringan']
      return {
        operations: titles.map((title) => ({
          command: { type: 'createNode', parentId: parent, kind: 'step', title } as Command,
          preview: `Tambah langkah "${title}" di bawah ${titleOf(doc, parent)}.`,
          confidence: 0.88,
        })),
      }
    },
  },
  {
    transcript: 'uji coba satu kelas bergantung pada anggaran laboratorium',
    build: (doc) => {
      const from = findByTitle(doc, 'Uji coba satu kelas')
      const to = findByTitle(doc, 'Anggaran laboratorium')
      if (!from || !to) return { operations: [], rawText: 'uji coba satu kelas bergantung pada anggaran laboratorium' }
      return {
        operations: [
          {
            command: { type: 'addRelation', fromId: from, toId: to, kind: 'depends_on' },
            preview: `Hubungkan "${titleOf(doc, from)}" bergantung pada "${titleOf(doc, to)}".`,
            confidence: 0.81,
          },
        ],
      }
    },
  },
  {
    transcript: 'kurangi bobot ujian akhir itu sebenarnya sudah jadi keputusan',
    build: (doc) => {
      const id = findByTitle(doc, 'Kurangi bobot ujian akhir')
      if (!id) return { operations: [], rawText: 'kurangi bobot ujian akhir sudah jadi keputusan' }
      return {
        operations: [
          {
            command: { type: 'setNodeKind', id, kind: 'decision' },
            preview: `Ubah "${titleOf(doc, id)}" dari gagasan menjadi keputusan.`,
            confidence: 0.72,
          },
        ],
      }
    },
  },
  {
    transcript: 'yang ini kita pindahkan ke sini saja ya',
    build: (doc, focusId) => {
      // The pointing case. Two people are pointing at different things, so the
      // system asks instead of guessing. This is the whole reason drafts exist.
      const pointed = findByTitle(doc, 'Kurangi bobot ujian akhir')
      const alt = findByTitle(doc, 'Anggaran laboratorium')
      const target = findByTitle(doc, 'Rancangan mata kuliah')
      const choices = [pointed, alt].filter((x): x is NodeId => Boolean(x))
      return {
        operations: [],
        ambiguities: [
          {
            question: 'Yang mana yang dimaksud "yang ini"?',
            choices: choices.map((id) => ({
              id,
              label: `${titleOf(doc, id)} — sedang ditunjuk`,
              command: { type: 'moveNode', id, parentId: target ?? focusId } as Command,
            })),
          },
        ],
      }
    },
  },
  {
    transcript: 'iya betul kayaknya sih begitu ya kalau menurut saya',
    build: () => ({
      operations: [],
      rawText: 'iya betul kayaknya sih begitu ya kalau menurut saya',
    }),
  },
]

/**
 * What gets "heard" when a proposal is already on screen.
 *
 * The point is not the word itself but the shape of the loop: speak, look,
 * speak again. Nothing in it requires a finger, which is the whole reason
 * voice is the primary path for someone who cannot press keys comfortably.
 */
export const CONFIRM_UTTERANCE: Utterance = {
  transcript: 'ya terapkan saja',
  build: () => ({ operations: [] }),
}

export function emptyDraft(): Draft {
  return {
    id: newDraftId(),
    status: 'idle',
    transcript: '',
    operations: [],
    ambiguities: [],
    rawText: null,
    startedAt: Date.now(),
  }
}

export function buildDraft(utterance: Utterance, doc: RoomDoc, focusId: NodeId | null): Draft {
  const parsed = utterance.build(doc, focusId)
  return {
    id: newDraftId(),
    status: 'ready',
    transcript: utterance.transcript,
    operations: parsed.operations.map((op, i) => ({ ...op, id: `op_${i}`, accepted: true })),
    ambiguities: (parsed.ambiguities ?? []).map((a, i) => ({ ...a, id: `amb_${i}` })),
    rawText: parsed.rawText ?? null,
    startedAt: Date.now(),
  }
}
