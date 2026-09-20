/**
 * Presentation-only labels: badges, hints and hues. The domain words themselves
 * live in core/vocabulary.ts.
 */

import { bilingual } from '../../core/i18n'
import type { NodeKind, RoomShape } from '../../core/model/types'

/** Short forms for the canvas badge, where space is tight. */
export const KIND_BADGE: Record<NodeKind, string> = bilingual(
  {
    root: 'AKR',
    idea: 'GAG',
    step: 'LGK',
    decision: 'KEP',
    question: 'TNY',
    fact: 'FKT',
    action: 'TDK',
    group: 'KLP',
  },
  {
    root: 'ROOT',
    idea: 'IDEA',
    step: 'STEP',
    decision: 'DEC',
    question: 'QUES',
    fact: 'FACT',
    action: 'ACT',
    group: 'GRP',
  },
)

export const SHAPE_HINT: Record<RoomShape, string> = bilingual(
  {
    mindmap: 'Cabang melebar ke kanan. Cocok untuk gagasan yang belum berurutan.',
    hierarchy: 'Menurun dari atas ke bawah. Cocok untuk struktur dan pembagian.',
    flow: 'Mengalir ke bawah mengikuti langkah. Cocok bila banyak langkah berurutan.',
    timeline: 'Melebar mengikuti waktu. Cocok bila banyak fakta bertanggal.',
    columns: 'Setiap kelompok jadi satu kolom. Cocok untuk membandingkan.',
  },
  {
    mindmap: 'Branches spreading rightwards. For ideas that have no order yet.',
    hierarchy: 'Descending from the top. For structure and division.',
    flow: 'Flowing downwards step by step. For a sequence of steps.',
    timeline: 'Spread out along time. For dated facts.',
    columns: 'Each group becomes a column. For comparing.',
  },
)

export const MODE_LABEL: Record<'meeting' | 'review', string> = bilingual(
  { meeting: 'Mode rapat', review: 'Mode telaah' },
  { meeting: 'Meeting mode', review: 'Review mode' },
)

export const MODE_HINT: Record<'meeting' | 'review', string> = bilingual(
  {
    meeting: 'Bunyi hemat, narasi menunggu jeda.',
    review: 'Bunyi penuh, tiap fokus terdengar.',
  },
  {
    meeting: 'Sparing sound, narration waits for a pause.',
    review: 'Full sound, every focus is heard.',
  },
)

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
