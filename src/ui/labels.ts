/**
 * Every Indonesian string that names a domain concept. Interface language is
 * Indonesian; code stays English, so this is the one crossing point.
 */

import type { InputPath, NodeKind, NodeState, RelationKind, RoomShape } from '../core/model/types'

export const KIND_LABEL: Record<NodeKind, string> = {
  root: 'akar',
  idea: 'gagasan',
  step: 'langkah',
  decision: 'keputusan',
  question: 'pertanyaan',
  fact: 'fakta',
  action: 'tindakan',
  group: 'kelompok',
}

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

export const STATE_LABEL: Record<NodeState, string> = {
  open: 'Terbuka',
  doing: 'Dikerjakan',
  done: 'Selesai',
  blocked: 'Tersendat',
}

export const RELATION_LABEL: Record<RelationKind, string> = {
  depends_on: 'bergantung pada',
  causes: 'menyebabkan',
  contradicts: 'bertentangan dengan',
  refers_to: 'merujuk ke',
  duplicates: 'menduplikasi',
  sequence: 'dilanjutkan oleh',
}

export const SHAPE_LABEL: Record<RoomShape, string> = {
  mindmap: 'Peta gagasan',
  hierarchy: 'Hierarki',
  flow: 'Diagram alur',
  timeline: 'Garis waktu',
  columns: 'Bagan kolom',
}

export const SHAPE_HINT: Record<RoomShape, string> = {
  mindmap: 'Cabang melebar ke kanan. Cocok untuk gagasan yang belum berurutan.',
  hierarchy: 'Menurun dari atas ke bawah. Cocok untuk struktur dan pembagian.',
  flow: 'Mengalir ke bawah mengikuti langkah. Cocok bila banyak langkah berurutan.',
  timeline: 'Melebar mengikuti waktu. Cocok bila banyak fakta bertanggal.',
  columns: 'Setiap kelompok jadi satu kolom. Cocok untuk membandingkan.',
}

export const INPUT_PATH_LABEL: Record<InputPath, string> = {
  keyboard: 'papan ketik',
  voice: 'suara',
  pointer: 'tetikus',
  system: 'sistem',
}

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
