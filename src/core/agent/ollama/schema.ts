/**
 * The shape the model is *made* to answer in, not asked to.
 *
 * `format` in Ollama is not a hint: llama.cpp compiles this into a grammar and
 * masks the sampler at every step, so nothing outside it can be produced. That
 * is what makes a 7B model usable on a shared canvas at all -- section 8 calls
 * for constrained decoding rather than "please reply in JSON", because small
 * models do not fail by being stupid, they fail by being inconsistent.
 *
 * It is also where the cost lives. Every `required` field is a field the model
 * must write out even when it has nothing to say, and at roughly 23 tokens a
 * second that is seconds of a meeting. Measured on this machine: a simple
 * "tambahkan pelatihan dosen" costs 146 tokens through this schema and 31
 * without one. Loosening it is a real option and belongs in this file alone.
 */

import type { NodeKind, RelationKind } from '../../model/types'
import { TEMPLATES } from '../../templates/registry'

export const KIND_BY_WORD: Record<string, NodeKind> = {
  gagasan: 'idea',
  langkah: 'step',
  keputusan: 'decision',
  pertanyaan: 'question',
  fakta: 'fact',
  tindakan: 'action',
  kelompok: 'group',
}

export const RELATION_BY_WORD: Record<string, RelationKind> = {
  bergantung_pada: 'depends_on',
  menyebabkan: 'causes',
  bertentangan_dengan: 'contradicts',
  merujuk_ke: 'refers_to',
  dilanjutkan_oleh: 'sequence',
}

// 'none' first: a required enum gets filled with its first value when the
// model has nothing to say, and that used to be 'voting'.
export const TEMPLATE_IDS = ['none', ...TEMPLATES.map((t) => t.id)]

export const OP_SCHEMA = {
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
export const SCHEMA = {
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

export interface ModelOp {
  jenis: 'tambah' | 'ubah_judul' | 'pindah' | 'hapus' | 'hubung'
  tipe?: string
  judul: string
  sasaran: string
  induk: string
  relasi?: string
}

export interface ModelAnswer {
  maksud: 'alat' | 'susun' | 'tanya' | 'tak-dikenali'
  templat: string
  disebut_langsung: boolean
  judul_alat: string
  operasi: ModelOp[]
  pertanyaan: string
  opsi: (ModelOp & { label: string; templat: string })[]
  alasan: string
}
