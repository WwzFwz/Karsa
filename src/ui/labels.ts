/**
 * Every Indonesian string that names a domain concept. Interface language is
 * Indonesian; code stays English, so this is the one crossing point.
 */

import type { InputPath, NodeKind, NodeState, RelationKind, RoomShape } from '../core/model/types'
import { bilingual } from '../i18n/lang'

export const KIND_LABEL: Record<NodeKind, string> = bilingual(
  {
    root: 'akar',
    idea: 'gagasan',
    step: 'langkah',
    decision: 'keputusan',
    question: 'pertanyaan',
    fact: 'fakta',
    action: 'tindakan',
    group: 'kelompok',
  },
  {
    root: 'root',
    idea: 'idea',
    step: 'step',
    decision: 'decision',
    question: 'question',
    fact: 'fact',
    action: 'action',
    group: 'group',
  },
)

/** Short forms for the canvas badge, where space is tight. */
export const KIND_BADGE: Record<NodeKind, string> = {
  root: 'AKR',
  idea: 'GAG',
  step: 'LGK',
  decision: 'KEP',
  question: 'TNY',
  fact: 'FKT',
  action: 'TDK',
  group: 'KLP',
}

export const STATE_LABEL: Record<NodeState, string> = bilingual(
  { open: 'Terbuka', doing: 'Dikerjakan', done: 'Selesai', blocked: 'Tersendat' },
  { open: 'Open', doing: 'In progress', done: 'Done', blocked: 'Blocked' },
)

export const RELATION_LABEL: Record<RelationKind, string> = bilingual(
  {
    depends_on: 'bergantung pada',
    causes: 'menyebabkan',
    contradicts: 'bertentangan dengan',
    refers_to: 'merujuk ke',
    duplicates: 'menduplikasi',
    sequence: 'dilanjutkan oleh',
  },
  {
    depends_on: 'depends on',
    causes: 'causes',
    contradicts: 'contradicts',
    refers_to: 'refers to',
    duplicates: 'duplicates',
    sequence: 'is followed by',
  },
)

export const SHAPE_LABEL: Record<RoomShape, string> = bilingual(
  { mindmap: 'Peta gagasan', hierarchy: 'Hierarki', flow: 'Diagram alur', timeline: 'Garis waktu', columns: 'Bagan kolom' },
  { mindmap: 'Mind map', hierarchy: 'Hierarchy', flow: 'Flow chart', timeline: 'Timeline', columns: 'Columns' },
)

export const SHAPE_HINT: Record<RoomShape, string> = {
  mindmap: 'Cabang melebar ke kanan. Cocok untuk gagasan yang belum berurutan.',
  hierarchy: 'Menurun dari atas ke bawah. Cocok untuk struktur dan pembagian.',
  flow: 'Mengalir ke bawah mengikuti langkah. Cocok bila banyak langkah berurutan.',
  timeline: 'Melebar mengikuti waktu. Cocok bila banyak fakta bertanggal.',
  columns: 'Setiap kelompok jadi satu kolom. Cocok untuk membandingkan.',
}

export const INPUT_PATH_LABEL: Record<InputPath, string> = bilingual(
  { keyboard: 'papan ketik', voice: 'suara', pointer: 'tetikus', system: 'sistem' },
  { keyboard: 'keyboard', voice: 'voice', pointer: 'mouse', system: 'system' },
)

export const MODE_LABEL = {
  meeting: 'Mode rapat',
  review: 'Mode telaah',
} as const

export const MODE_HINT = {
  meeting: 'Bunyi ditekan, narasi menunggu jeda bicara.',
  review: 'Bunyi penuh, setiap perpindahan fokus terdengar.',
} as const

/**
 * Hue per node kind, shared by the canvas card, the outline icon and the
 * earcon timbre pickers. Kept next to the words so a new kind cannot be added
 * with a label but no colour.
 */
export const KIND_HUE: Record<NodeKind, number> = {
  root: 222,
  idea: 42,
  step: 202,
  decision: 272,
  question: 8,
  fact: 162,
  action: 322,
  group: 216,
}
