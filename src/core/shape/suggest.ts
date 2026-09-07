/**
 * Choosing the visual shape from what is actually in the model.
 *
 * The shape is a suggestion, never an automatic switch. A canvas that rearranges
 * itself while a blind person is halfway through an audio traversal is a
 * nightmare, so the system proposes and a person applies (see docs/data-model.md
 * section F).
 */

import type { RoomDoc, RoomShape } from '../model/types'
import type { TreeProjection } from '../tree/project'

export interface ShapeSuggestion {
  shape: RoomShape
  /** 0..1. Below 0.55 the interface stays quiet about it. */
  confidence: number
  /** Shown to the person, in Indonesian, in one sentence. */
  reason: string
}

export function suggestShape(doc: RoomDoc, tree: TreeProjection): ShapeSuggestion {
  const nodes = Object.values(doc.nodes)
  const total = nodes.length || 1
  const count = (kind: string) => nodes.filter((n) => n.kind === kind).length
  const relations = Object.values(doc.relations)
  const sequenceCount = relations.filter((r) => r.kind === 'sequence').length

  const steps = count('step')
  const facts = count('fact')
  const groups = tree.rootIds.flatMap((id) => tree.byId.get(id)?.childIds ?? [])
    .filter((id) => doc.nodes[id]?.kind === 'group').length

  const candidates: ShapeSuggestion[] = [
    {
      shape: 'flow',
      confidence: (steps / total) * 0.7 + Math.min(sequenceCount / 4, 1) * 0.3,
      reason: `${steps} dari ${total} simpul berupa langkah, dan ada ${sequenceCount} hubungan berurutan.`,
    },
    {
      shape: 'timeline',
      confidence: (facts / total) * 0.8,
      reason: `${facts} dari ${total} simpul berupa fakta yang bisa diurutkan.`,
    },
    {
      shape: 'columns',
      confidence: groups >= 2 ? 0.6 + Math.min(groups / 10, 0.3) : 0,
      reason: `Ada ${groups} kelompok di tingkat pertama, cocok dibandingkan berdampingan.`,
    },
    {
      shape: 'mindmap',
      confidence: 0.5,
      reason: 'Isinya masih berupa gagasan yang belum berurutan.',
    },
  ]

  candidates.sort((a, b) => b.confidence - a.confidence)
  return candidates[0]
}
