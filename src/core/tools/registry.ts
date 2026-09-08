/**
 * What a tool is, in one table.
 *
 * The rule this file exists to keep: a tool never adds a kind of object. It
 * declares how to draw a sub-tree, what its children are called, and which
 * command operates it. Everything else -- the outline, audio traversal, undo,
 * narration, attribution -- keeps working because there is nothing new to
 * teach it.
 *
 * Adding a tool means adding a row here plus a renderer. It does not mean
 * touching the model, and it must never mean touching rule 1 or rule 2.
 */

import type { IconName } from '../../ui/icons'
import type { NodeKind, ToolKind } from '../model/types'

export interface ToolSpec {
  id: ToolKind
  label: string
  icon: IconName
  /** One line, shown where the tool is offered. */
  hint: string
  /** What a child of this node is called, so every sentence can say it. */
  itemWord: string
  /** The kind a new child gets, so speaking a tool into being types it too. */
  itemKind: NodeKind
  /**
   * What the agent may ask for. Deliberately per tool rather than one shared
   * shape: a schema that fits every tool fits none of them well, and a small
   * exact schema is what makes constrained decoding land (section 8).
   */
  schema: { field: string; type: 'string' | 'string[]'; required: boolean; note: string }[]
}

export const TOOLS: Record<ToolKind, ToolSpec> = {
  suara: {
    id: 'suara',
    label: 'Voting',
    icon: 'checkSquare',
    hint: 'Pilihan jadi anak simpul ini, dan suaranya dihitung dari catatan peristiwa.',
    itemWord: 'pilihan',
    itemKind: 'idea',
    schema: [
      { field: 'judul', type: 'string', required: true, note: 'Yang sedang diputuskan.' },
      { field: 'pilihan', type: 'string[]', required: true, note: 'Dua atau lebih.' },
    ],
  },
}

export const TOOL_LIST: ToolSpec[] = Object.values(TOOLS)

export function toolOf(tool: ToolKind | undefined): ToolSpec | null {
  return tool ? TOOLS[tool] : null
}
