/**
 * The nine rules, as checks that actually run.
 *
 * These are not style preferences. Breaking one of them cancels a core product
 * claim, so every command goes through here before it touches the document.
 */

import type { Node, NodeId, NodeKind, RoomDoc } from '../model/types'

/** Rule 4: a title must be sayable in one breath (D1). */
export const TITLE_MAX = 60
export const RELATION_LABEL_MAX = 40
export const NOTE_MAX = 1000

export interface RuleViolation {
  /** Which of the nine rules this violates. 0 means a plain integrity error. */
  rule: number
  code: string
  /** Shown to the person, in Indonesian. */
  message: string
}

export const NODE_KINDS: NodeKind[] = [
  'root',
  'idea',
  'step',
  'decision',
  'question',
  'fact',
  'action',
  'group',
]

export function checkTitle(title: string): RuleViolation | null {
  const trimmed = title.trim()
  if (trimmed.length === 0) {
    return { rule: 3, code: 'title_empty', message: 'Judul tidak boleh kosong.' }
  }
  if (trimmed.length > TITLE_MAX) {
    return {
      rule: 4,
      code: 'title_too_long',
      message: `Judul melebihi ${TITLE_MAX} karakter. Pindahkan uraiannya ke catatan.`,
    }
  }
  return null
}

export function checkRelationLabel(label: string | undefined): RuleViolation | null {
  if (!label) return null
  if (label.trim().length > RELATION_LABEL_MAX) {
    return {
      rule: 4,
      code: 'label_too_long',
      message: `Label hubungan melebihi ${RELATION_LABEL_MAX} karakter.`,
    }
  }
  return null
}

export function checkKind(kind: string): RuleViolation | null {
  if (!NODE_KINDS.includes(kind as NodeKind)) {
    return {
      rule: 3,
      code: 'unknown_kind',
      message: 'Tipe simpul tidak dikenali. Semua isi bermakna harus punya tipe.',
    }
  }
  return null
}

export function nodeExists(doc: RoomDoc, id: NodeId | null): boolean {
  return id === null || Object.prototype.hasOwnProperty.call(doc.nodes, id)
}

/**
 * Rule 1, checked before the write rather than after the merge. This catches
 * the single-device case; the crossing-move case that only appears after a
 * merge is handled as a read-time projection in core/tree/project.ts.
 */
export function wouldCreateCycle(
  nodes: Record<NodeId, Node>,
  moving: NodeId,
  nextParent: NodeId | null,
): boolean {
  let cursor = nextParent
  const seen = new Set<NodeId>()
  while (cursor !== null) {
    if (cursor === moving) return true
    if (seen.has(cursor)) return true
    seen.add(cursor)
    const parent = nodes[cursor]
    if (!parent) return false
    cursor = parent.parentId
  }
  return false
}

/** Rule 1: a node has exactly one parent, and it is never itself. */
export function checkMove(
  doc: RoomDoc,
  moving: NodeId,
  nextParent: NodeId | null,
): RuleViolation | null {
  if (!doc.nodes[moving]) {
    return { rule: 0, code: 'missing_node', message: 'Simpul tidak ditemukan.' }
  }
  if (!nodeExists(doc, nextParent)) {
    return { rule: 0, code: 'missing_parent', message: 'Induk tujuan tidak ditemukan.' }
  }
  if (moving === nextParent) {
    return {
      rule: 1,
      code: 'self_parent',
      message: 'Simpul tidak bisa menjadi induk dirinya sendiri.',
    }
  }
  if (wouldCreateCycle(doc.nodes, moving, nextParent)) {
    return {
      rule: 1,
      code: 'cycle',
      message: 'Pemindahan itu akan membuat lingkaran. Pohon harus tetap pohon.',
    }
  }
  return null
}
