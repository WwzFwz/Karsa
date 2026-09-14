/**
 * What gets sent to the model: structure, never a screenshot (section 8).
 *
 * This is smaller and more exact than an image, and it is the reason the whole
 * thing can run on a small local model. It is also the reason the privacy claim
 * survives contact with an agent: what leaves this function is an outline, a
 * focus, and a list of tool schemas. No audio, no picture, no coordinates.
 *
 * It is rendered as text on purpose. A person should be able to read exactly
 * what the assistant was told before it answered, and "trust me" is not an
 * accessibility feature.
 */

import type { TreeProjection } from '../tree/project'
import type { NodeId, RoomDoc } from '../model/types'
import { KIND_LABEL } from '../../ui/labels'
import { TOOL_LIST } from '../tools/registry'
import { TEMPLATES } from '../templates/registry'

/** Deep enough to place a node, shallow enough to stay small. */
const MAX_DEPTH = 3
const MAX_LINES = 40

export interface AgentContext {
  roomTitle: string
  shape: string
  /** Indented outline, one line per node. */
  outline: string[]
  focus: { id: NodeId; title: string; kind: string } | null
  /** Titles touched most recently, newest first: what "yang tadi" points at. */
  recent: string[]
  /** Names the model may answer with, and the fields each one needs. */
  tools: { id: string; label: string; fields: string[] }[]
  templates: { id: string; label: string }[]
}

export function buildContext(
  doc: RoomDoc,
  tree: TreeProjection,
  focusId: NodeId | null,
): AgentContext {
  const outline: string[] = []
  for (const id of tree.preorder) {
    if (outline.length >= MAX_LINES) break
    const entry = tree.byId.get(id)
    const node = doc.nodes[id]
    if (!entry || !node || entry.depth > MAX_DEPTH) continue
    outline.push(`${'  '.repeat(entry.depth)}- ${KIND_LABEL[node.kind]}: ${node.title}`)
  }

  const focusNode = focusId ? doc.nodes[focusId] : null

  const recent: string[] = []
  for (let i = doc.events.length - 1; i >= 0 && recent.length < 3; i -= 1) {
    const e = doc.events[i]
    if (e.type === 'undo') continue
    const title = e.payload.title
    if (title && !recent.includes(title)) recent.push(title)
  }

  return {
    roomTitle: doc.room.title,
    shape: doc.room.shape,
    outline,
    focus: focusNode
      ? { id: focusNode.id, title: focusNode.title, kind: KIND_LABEL[focusNode.kind] }
      : null,
    recent,
    // Per tool, its own fields -- not one shared schema (D41). A small exact
    // schema is what makes constrained decoding land.
    tools: TOOL_LIST.map((tool) => ({
      id: tool.id,
      label: tool.label,
      fields: tool.schema.map((field) => `${field.field}${field.required ? '' : '?'}`),
    })),
    templates: TEMPLATES.map((template) => ({ id: template.id, label: template.label })),
  }
}

/** The same context as the text a person can read back. */
export function renderContext(context: AgentContext): string {
  const lines = [
    `ruang: ${context.roomTitle}`,
    `bentuk: ${context.shape}`,
    context.focus ? `fokus: ${context.focus.kind} "${context.focus.title}"` : 'fokus: (tidak ada)',
    `baru saja: ${context.recent.length ? context.recent.map((t) => `"${t}"`).join(', ') : '(belum ada)'}`,
    '',
    'outline:',
    ...context.outline,
    '',
    `alat: ${context.tools.map((t) => `${t.id}(${t.fields.join(', ')})`).join(' ')}`,
    `templat: ${context.templates.map((t) => t.id).join(' ')}`,
  ]
  return lines.join('\n')
}
