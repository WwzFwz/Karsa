/**
 * command -> validated change -> event.
 *
 * Every branch does the same three things: check the rules, mutate the draft
 * document, and emit an event whose payload already contains the words the
 * sentence will need. If a branch cannot fill in a sensible payload, that is a
 * sign the operation fails rule 5 and should not exist.
 */

import { newCommentId, newEventId, newNodeId, newRelationId } from '../model/ids'
import { compareSiblings, orderBetween } from '../model/order'
import type { DocEvent, EventPayload, EventType } from '../events/types'
import type { Comment, Node, NodeId, RoomDoc } from '../model/types'
import { checkKind, checkMove, checkRelationLabel, checkTitle, NOTE_MAX, type RuleViolation } from '../rules/invariants'
import { countVotes, hasVoted } from '../tools/tally'
import { descendantsOf, projectTree } from '../tree/project'
import type { Command, CommandContext, CommandResult } from './types'

function fail(violation: RuleViolation): CommandResult {
  return { ok: false, violation }
}

function siblingsOf(doc: RoomDoc, parentId: NodeId | null): Node[] {
  return Object.values(doc.nodes)
    .filter((n) => n.parentId === parentId)
    .sort(compareSiblings)
}

/** Order key that places a node directly after `afterId`, or last if omitted. */
function orderAfter(doc: RoomDoc, parentId: NodeId | null, afterId: NodeId | null | undefined, exclude?: NodeId): string {
  const siblings = siblingsOf(doc, parentId).filter((n) => n.id !== exclude)
  if (afterId === undefined || afterId === null) {
    const last = siblings[siblings.length - 1]
    return orderBetween(last ? last.order : null, null)
  }
  const index = siblings.findIndex((n) => n.id === afterId)
  if (index < 0) {
    const last = siblings[siblings.length - 1]
    return orderBetween(last ? last.order : null, null)
  }
  return orderBetween(siblings[index].order, siblings[index + 1]?.order ?? null)
}

function titleOf(doc: RoomDoc, id: NodeId | null | undefined): string | undefined {
  if (!id) return undefined
  return doc.nodes[id]?.title
}

/**
 * Applies one command to a shallow-cloned document. The store swaps the whole
 * object in, which keeps React's identity checks honest and mirrors how a Yjs
 * transaction will land later.
 */
export function applyCommand(doc: RoomDoc, command: Command, ctx: CommandContext): { doc: RoomDoc; result: CommandResult } {
  const now = Date.now()
  const next: RoomDoc = {
    room: doc.room,
    nodes: { ...doc.nodes },
    relations: { ...doc.relations },
    comments: { ...doc.comments },
    events: doc.events,
    actors: doc.actors,
  }

  const emitted: { type: EventType; payload: EventPayload; origin?: 'user' | 'system' }[] = []
  const stamp = { updatedBy: ctx.actorId, updatedAt: now, inputPath: ctx.inputPath }

  switch (command.type) {
    case 'createNode': {
      const titleViolation = checkTitle(command.title)
      if (titleViolation) return { doc, result: fail(titleViolation) }
      const kindViolation = checkKind(command.kind)
      if (kindViolation) return { doc, result: fail(kindViolation) }
      if (command.parentId !== null && !doc.nodes[command.parentId]) {
        return { doc, result: fail({ rule: 0, code: 'missing_parent', message: 'Induk tujuan tidak ditemukan.' }) }
      }
      if (command.id && doc.nodes[command.id]) {
        return { doc, result: fail({ rule: 0, code: 'duplicate_id', message: 'Simpul dengan id itu sudah ada.' }) }
      }
      const id = command.id ?? newNodeId()
      next.nodes[id] = {
        id,
        parentId: command.parentId,
        order: orderAfter(doc, command.parentId, command.afterId),
        kind: command.kind,
        title: command.title.trim(),
        note: command.note?.slice(0, NOTE_MAX),
        tool: command.tool,
        createdBy: ctx.actorId,
        createdAt: now,
        ...stamp,
      }
      emitted.push({
        type: 'createNode',
        payload: { nodeId: id, title: command.title.trim(), kind: command.kind, parentTitle: titleOf(doc, command.parentId) },
      })
      break
    }

    case 'renameNode': {
      const node = doc.nodes[command.id]
      if (!node) return { doc, result: fail({ rule: 0, code: 'missing_node', message: 'Simpul tidak ditemukan.' }) }
      const violation = checkTitle(command.title)
      if (violation) return { doc, result: fail(violation) }
      next.nodes[command.id] = { ...node, title: command.title.trim(), ...stamp }
      emitted.push({
        type: 'renameNode',
        payload: { nodeId: node.id, title: command.title.trim(), previousTitle: node.title },
      })
      break
    }

    case 'setNodeKind': {
      const node = doc.nodes[command.id]
      if (!node) return { doc, result: fail({ rule: 0, code: 'missing_node', message: 'Simpul tidak ditemukan.' }) }
      const violation = checkKind(command.kind)
      if (violation) return { doc, result: fail(violation) }
      next.nodes[command.id] = { ...node, kind: command.kind, ...stamp }
      emitted.push({
        type: 'setNodeKind',
        payload: { nodeId: node.id, title: node.title, kind: command.kind, previousKind: node.kind },
      })
      break
    }

    case 'setNodeState': {
      const node = doc.nodes[command.id]
      if (!node) return { doc, result: fail({ rule: 0, code: 'missing_node', message: 'Simpul tidak ditemukan.' }) }
      next.nodes[command.id] = { ...node, state: command.state, ...stamp }
      emitted.push({ type: 'setNodeState', payload: { nodeId: node.id, title: node.title, state: command.state } })
      break
    }

    case 'setNodeTool': {
      const node = doc.nodes[command.id]
      if (!node) return { doc, result: fail({ rule: 0, code: 'missing_node', message: 'Simpul tidak ditemukan.' }) }
      const nextNode = { ...node, ...stamp }
      if (command.tool) nextNode.tool = command.tool
      else delete nextNode.tool
      next.nodes[command.id] = nextNode
      emitted.push({
        type: 'setNodeTool',
        payload: {
          nodeId: node.id,
          title: node.title,
          tool: command.tool ?? undefined,
          previousTool: node.tool,
        },
      })
      break
    }

    /*
      A vote is not stored on the node. It is an event by an actor, and the
      tally is read back off the log -- which means undo, attribution and the
      contribution summary all work without a single line written for them.
    */
    case 'voteNode': {
      const node = doc.nodes[command.id]
      if (!node) return { doc, result: fail({ rule: 0, code: 'missing_node', message: 'Simpul tidak ditemukan.' }) }
      const had = hasVoted(doc, command.id, ctx.actorId)
      const voters = countVotes(doc, command.id) + (had ? -1 : 1)
      emitted.push({
        type: had ? 'unvoteNode' : 'voteNode',
        payload: { nodeId: node.id, title: node.title, voteCount: voters },
      })
      break
    }

    case 'setNodeNote': {
      const node = doc.nodes[command.id]
      if (!node) return { doc, result: fail({ rule: 0, code: 'missing_node', message: 'Simpul tidak ditemukan.' }) }
      next.nodes[command.id] = { ...node, note: command.note.slice(0, NOTE_MAX), ...stamp }
      emitted.push({ type: 'setNodeNote', payload: { nodeId: node.id, title: node.title } })
      break
    }

    case 'moveNode': {
      const violation = checkMove(doc, command.id, command.parentId)
      if (violation) return { doc, result: fail(violation) }
      const node = doc.nodes[command.id]
      next.nodes[command.id] = {
        ...node,
        parentId: command.parentId,
        order: orderAfter(doc, command.parentId, command.afterId, command.id),
        ...stamp,
      }
      emitted.push({
        type: 'moveNode',
        payload: {
          nodeId: node.id,
          title: node.title,
          parentTitle: titleOf(doc, command.parentId),
          previousParentTitle: titleOf(doc, node.parentId),
        },
      })
      break
    }

    case 'reorderNode': {
      const node = doc.nodes[command.id]
      if (!node) return { doc, result: fail({ rule: 0, code: 'missing_node', message: 'Simpul tidak ditemukan.' }) }
      const siblings = siblingsOf(doc, node.parentId)
      const index = siblings.findIndex((n) => n.id === node.id)
      const target = command.direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= siblings.length) {
        return {
          doc,
          result: fail({ rule: 0, code: 'at_edge', message: 'Sudah di ujung urutan.' }),
        }
      }
      const lower = command.direction === 'up' ? siblings[target - 1]?.order ?? null : siblings[target].order
      const upper = command.direction === 'up' ? siblings[target].order : siblings[target + 1]?.order ?? null
      next.nodes[command.id] = { ...node, order: orderBetween(lower, upper), ...stamp }
      emitted.push({
        type: 'reorderNode',
        payload: { nodeId: node.id, title: node.title, direction: command.direction, position: target + 1 },
      })
      break
    }

    case 'deleteNode': {
      const node = doc.nodes[command.id]
      if (!node) return { doc, result: fail({ rule: 0, code: 'missing_node', message: 'Simpul tidak ditemukan.' }) }
      const tree = projectTree(doc)
      const descendants = descendantsOf(tree, command.id)
      if (command.mode === 'cascade') {
        for (const id of [command.id, ...descendants]) delete next.nodes[id]
      } else {
        // Promote: children move up to the grandparent, so nothing is lost by
        // accident. Cascade stays available but must be asked for explicitly.
        delete next.nodes[command.id]
        for (const childId of tree.byId.get(command.id)?.childIds ?? []) {
          const child = doc.nodes[childId]
          next.nodes[childId] = {
            ...child,
            parentId: node.parentId,
            order: orderAfter(doc, node.parentId, node.id, childId),
            ...stamp,
          }
        }
      }
      for (const relation of Object.values(next.relations)) {
        const gone = !next.nodes[relation.fromId] || !next.nodes[relation.toId]
        if (gone) delete next.relations[relation.id]
      }
      emitted.push({
        type: 'deleteNode',
        payload: {
          nodeId: node.id,
          title: node.title,
          descendantCount: command.mode === 'cascade' ? descendants.length : 0,
        },
      })
      break
    }

    case 'addRelation': {
      if (!doc.nodes[command.fromId] || !doc.nodes[command.toId]) {
        return { doc, result: fail({ rule: 0, code: 'missing_node', message: 'Simpul tidak ditemukan.' }) }
      }
      if (command.fromId === command.toId) {
        return { doc, result: fail({ rule: 0, code: 'self_relation', message: 'Simpul tidak bisa dihubungkan ke dirinya sendiri.' }) }
      }
      const labelViolation = checkRelationLabel(command.label)
      if (labelViolation) return { doc, result: fail(labelViolation) }
      const id = newRelationId()
      next.relations[id] = {
        id,
        fromId: command.fromId,
        toId: command.toId,
        kind: command.kind,
        label: command.label?.trim() || undefined,
        createdBy: ctx.actorId,
        createdAt: now,
        inputPath: ctx.inputPath,
      }
      emitted.push({
        type: 'addRelation',
        payload: {
          fromTitle: titleOf(doc, command.fromId),
          toTitle: titleOf(doc, command.toId),
          relationKind: command.kind,
        },
      })
      break
    }

    case 'removeRelation': {
      const relation = doc.relations[command.id]
      if (!relation) return { doc, result: fail({ rule: 0, code: 'missing_relation', message: 'Hubungan tidak ditemukan.' }) }
      delete next.relations[command.id]
      emitted.push({
        type: 'removeRelation',
        payload: { fromTitle: titleOf(doc, relation.fromId), toTitle: titleOf(doc, relation.toId) },
      })
      break
    }

    case 'relabelRelation': {
      const relation = doc.relations[command.id]
      if (!relation) return { doc, result: fail({ rule: 0, code: 'missing_relation', message: 'Hubungan tidak ditemukan.' }) }
      const violation = checkRelationLabel(command.label)
      if (violation) return { doc, result: fail(violation) }
      next.relations[command.id] = { ...relation, label: command.label.trim() || undefined }
      emitted.push({
        type: 'relabelRelation',
        payload: {
          label: command.label.trim(),
          fromTitle: titleOf(doc, relation.fromId),
          toTitle: titleOf(doc, relation.toId),
        },
      })
      break
    }

    case 'addComment': {
      const target =
        command.targetType === 'node' ? doc.nodes[command.targetId] : doc.relations[command.targetId]
      if (!target) return { doc, result: fail({ rule: 0, code: 'missing_target', message: 'Sasaran komentar tidak ditemukan.' }) }
      if (command.body.trim().length === 0) {
        return { doc, result: fail({ rule: 0, code: 'empty_comment', message: 'Komentar tidak boleh kosong.' }) }
      }
      const id = newCommentId()
      const comment: Comment = {
        id,
        targetType: command.targetType,
        targetId: command.targetId,
        replyToId: command.replyToId,
        body: command.body.trim(),
        authorId: ctx.actorId,
        createdAt: now,
      }
      next.comments[id] = comment
      emitted.push({
        type: 'addComment',
        payload: { targetTitle: command.targetType === 'node' ? titleOf(doc, command.targetId) : 'sebuah hubungan' },
      })
      break
    }

    case 'resolveComment': {
      const comment = doc.comments[command.id]
      if (!comment) return { doc, result: fail({ rule: 0, code: 'missing_comment', message: 'Komentar tidak ditemukan.' }) }
      next.comments[command.id] = { ...comment, resolvedAt: now, resolvedBy: ctx.actorId }
      emitted.push({
        type: 'resolveComment',
        payload: { targetTitle: comment.targetType === 'node' ? titleOf(doc, comment.targetId) : 'sebuah hubungan' },
      })
      break
    }

    case 'setRoomTitle': {
      const violation = checkTitle(command.title)
      if (violation) return { doc, result: fail(violation) }
      next.room = { ...doc.room, title: command.title.trim() }
      emitted.push({ type: 'setRoomTitle', payload: { title: command.title.trim() } })
      break
    }

    case 'setRoomShape': {
      if (doc.room.shape === command.shape) {
        return { doc, result: fail({ rule: 0, code: 'no_change', message: 'Bentuk kanvas sudah seperti itu.' }) }
      }
      next.room = { ...doc.room, shape: command.shape }
      emitted.push({
        type: 'setRoomShape',
        payload: { shape: command.shape, previousShape: doc.room.shape },
      })
      break
    }
  }

  const events: DocEvent[] = emitted.map((e, i) => ({
    id: newEventId(),
    seq: doc.events.length + i + 1,
    at: now,
    actorId: ctx.actorId,
    inputPath: ctx.inputPath,
    type: e.type,
    payload: e.payload,
    origin: e.origin ?? 'user',
  }))

  next.events = [...doc.events, ...events]
  return { doc: next, result: { ok: true, events } }
}
