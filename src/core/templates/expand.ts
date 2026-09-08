/**
 * A template turned into commands.
 *
 * Ids are minted here rather than inside `applyCommand`, because a child needs
 * to name its parent before that parent exists as far as the store is
 * concerned. Everything else stays ordinary: these are the same createNode
 * commands a person typing would have produced, so validation, narration,
 * attribution and undo treat a template exactly like six deliberate acts.
 */

import { newNodeId } from '../model/ids'
import type { Command } from '../commands/types'
import type { NodeId } from '../model/types'
import type { TemplateNode } from './registry'

export function expandTemplate(node: TemplateNode, parentId: NodeId | null): Command[] {
  const id = newNodeId()
  const commands: Command[] = [
    {
      type: 'createNode',
      id,
      parentId,
      kind: node.kind,
      title: node.title,
      note: node.note,
      tool: node.tool,
    },
  ]
  for (const child of node.children ?? []) commands.push(...expandTemplate(child, id))
  return commands
}

/** How many nodes a template will land, so the sentence can say it. */
export function templateSize(node: TemplateNode): number {
  return 1 + (node.children ?? []).reduce((total, child) => total + templateSize(child), 0)
}
