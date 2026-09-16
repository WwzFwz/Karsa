/**
 * Presentation-only labels: badges, hints and hues. The domain words themselves
 * live in core/vocabulary.ts.
 */

import type { NodeKind, RoomShape } from '../core/model/types'

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

export const SHAPE_HINT: Record<RoomShape, string> = {
  mindmap: 'Cabang melebar ke kanan. Cocok untuk gagasan yang belum berurutan.',
  hierarchy: 'Menurun dari atas ke bawah. Cocok untuk struktur dan pembagian.',
  flow: 'Mengalir ke bawah mengikuti langkah. Cocok bila banyak langkah berurutan.',
  timeline: 'Melebar mengikuti waktu. Cocok bila banyak fakta bertanggal.',
  columns: 'Setiap kelompok jadi satu kolom. Cocok untuk membandingkan.',
}

export const MODE_LABEL = {
  meeting: 'Mode rapat',
  review: 'Mode telaah',
} as const

export const MODE_HINT = {
  meeting: 'Bunyi hemat, narasi menunggu jeda.',
  review: 'Bunyi penuh, tiap fokus terdengar.',
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
