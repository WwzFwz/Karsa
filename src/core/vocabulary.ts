/**
 * The words for domain concepts, in both languages.
 *
 * These are part of the domain, not the interface: narration, the outline, the
 * assistant's proposals and the command palette all say "gagasan" for an idea,
 * and they must never disagree. Lives in core so the sentence builders here can
 * use it without core depending on the interface layer.
 */

import type { InputPath, NodeKind, NodeState, RelationKind, RoomShape } from './model/types'
import { bilingual } from './i18n'

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

export const INPUT_PATH_LABEL: Record<InputPath, string> = bilingual(
  { keyboard: 'papan ketik', voice: 'suara', pointer: 'tetikus', system: 'sistem' },
  { keyboard: 'keyboard', voice: 'voice', pointer: 'mouse', system: 'system' },
)
