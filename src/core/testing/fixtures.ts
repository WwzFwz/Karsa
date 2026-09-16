/**
 * Small, explicit documents for tests.
 *
 * Built by hand from core types rather than borrowed from the seed room, so a
 * test says exactly what state it starts from and core tests never depend on
 * the store layer.
 */

import { applyCommand } from '../commands/apply'
import type { Command } from '../commands/types'
import type { DocEvent, EventType } from '../events/types'
import type { Node, NodeId, RoomDoc } from '../model/types'

export function emptyDoc(): RoomDoc {
  return {
    room: { id: 'TST-001', title: 'Ruang uji', shape: 'mindmap', createdAt: 0 },
    nodes: {},
    relations: {},
    comments: {},
    events: [],
    actors: { a1: { id: 'a1', displayName: 'Ani', hue: 10 }, a2: { id: 'a2', displayName: 'Budi', hue: 200 } },
  }
}

/** A node placed directly, bypassing validation -- for building broken states on purpose. */
export function rawNode(id: NodeId, parentId: NodeId | null, order = 'm'): Node {
  return {
    id,
    parentId,
    order,
    kind: 'idea',
    title: id,
    createdBy: 'a1',
    createdAt: 0,
    updatedBy: 'a1',
    updatedAt: 0,
    inputPath: 'keyboard',
  }
}

export function withNodes(...nodes: Node[]): RoomDoc {
  const doc = emptyDoc()
  for (const node of nodes) doc.nodes[node.id] = node
  return doc
}

/** Applies a command that is expected to succeed, and fails the test loudly if it does not. */
export function run(doc: RoomDoc, command: Command, actorId = 'a1'): RoomDoc {
  const { doc: next, result } = applyCommand(doc, command, { actorId, inputPath: 'keyboard' })
  if (!result.ok) throw new Error(`Expected ${command.type} to succeed: ${result.violation.message}`)
  return next
}

let seq = 0
export function event(type: EventType, actorId: string, payload: DocEvent['payload'] = {}): DocEvent {
  seq += 1
  return { id: `e${seq}`, seq, at: seq, actorId, inputPath: 'keyboard', type, payload, origin: 'user' }
}
