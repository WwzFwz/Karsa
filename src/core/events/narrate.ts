/**
 * One event, one sentence -- in Indonesian or English, written side by side.
 *
 * This file is the executable form of rule 5. If a new operation cannot be
 * given a sentence here, the operation must not exist -- do not reach for a
 * generic fallback string to get around it.
 *
 * The same sentence is used by the screen reader announcer, the event log panel
 * and review mode, so the three can never drift apart.
 */

import { KIND_LABEL, RELATION_LABEL, SHAPE_LABEL, STATE_LABEL } from '../../ui/labels'
import { tr } from '../../i18n/lang'
import { TOOLS } from '../tools/registry'
import type { DocEvent } from './types'

function actor(name: string): string {
  return name
}

function quoted(title: string | undefined): string {
  return title ? title : tr('simpul tanpa judul', 'an untitled node')
}

function votes(n: number): string {
  return tr(`${n} suara`, `${n} ${n === 1 ? 'vote' : 'votes'}`)
}

export function narrate(event: DocEvent, actorName: string): string {
  const who = actor(actorName)
  const p = event.payload
  const kind = KIND_LABEL[p.kind ?? 'idea']
  const title = quoted(p.title)

  switch (event.type) {
    case 'createNode':
      return p.parentTitle
        ? tr(
            `${who} menambahkan ${kind} ${title} di bawah ${quoted(p.parentTitle)}.`,
            `${who} added ${kind} ${title} under ${quoted(p.parentTitle)}.`,
          )
        : tr(`${who} menambahkan ${kind} ${title} di akar.`, `${who} added ${kind} ${title} at the root.`)
    case 'renameNode':
      return tr(
        `${who} mengubah judul ${quoted(p.previousTitle)} menjadi ${title}.`,
        `${who} renamed ${quoted(p.previousTitle)} to ${title}.`,
      )
    case 'setNodeKind':
      return tr(`${who} mengubah ${title} menjadi ${kind}.`, `${who} turned ${title} into ${kind}.`)
    case 'setNodeState': {
      const state = STATE_LABEL[p.state ?? 'open'].toLowerCase()
      return tr(`${who} menandai ${title} ${state}.`, `${who} marked ${title} as ${state}.`)
    }
    case 'setNodeNote':
      return tr(`${who} menyunting catatan pada ${title}.`, `${who} edited the note on ${title}.`)
    case 'setNodeTool':
      return p.tool
        ? tr(
            `${who} menjadikan ${title} alat ${TOOLS[p.tool].label.toLowerCase()}.`,
            `${who} turned ${title} into a ${TOOLS[p.tool].label.toLowerCase()} tool.`,
          )
        : tr(`${who} mengembalikan ${title} menjadi simpul biasa.`, `${who} turned ${title} back into a plain node.`)
    // The count is in the sentence because a tally nobody can see is a tally
    // that only exists for people who can see it.
    case 'voteNode':
      return tr(
        `${who} memilih ${title}, sekarang ${votes(p.voteCount ?? 1)}.`,
        `${who} voted for ${title}, now ${votes(p.voteCount ?? 1)}.`,
      )
    case 'unvoteNode':
      return tr(
        `${who} menarik pilihan dari ${title}, sekarang ${votes(p.voteCount ?? 0)}.`,
        `${who} withdrew a vote from ${title}, now ${votes(p.voteCount ?? 0)}.`,
      )
    case 'moveNode':
      return p.parentTitle
        ? tr(
            `${who} memindahkan ${title} ke bawah ${quoted(p.parentTitle)}.`,
            `${who} moved ${title} under ${quoted(p.parentTitle)}.`,
          )
        : tr(`${who} memindahkan ${title} ke akar.`, `${who} moved ${title} to the root.`)
    case 'reorderNode':
      return tr(
        `${who} memindahkan ${title} ke urutan ${p.position ?? 1}.`,
        `${who} moved ${title} to position ${p.position ?? 1}.`,
      )
    case 'deleteNode': {
      const n = p.descendantCount ?? 0
      return n > 0
        ? tr(`${who} menghapus ${title} beserta ${n} turunannya.`, `${who} deleted ${title} and ${n} nodes under it.`)
        : tr(`${who} menghapus ${title}.`, `${who} deleted ${title}.`)
    }
    case 'addRelation': {
      const rel = RELATION_LABEL[p.relationKind ?? 'refers_to']
      return tr(
        `${who} menghubungkan ${quoted(p.fromTitle)} ${rel} ${quoted(p.toTitle)}.`,
        `${who} linked ${quoted(p.fromTitle)}, ${rel} ${quoted(p.toTitle)}.`,
      )
    }
    case 'removeRelation':
      return tr(
        `${who} melepas hubungan ${quoted(p.fromTitle)} dan ${quoted(p.toTitle)}.`,
        `${who} removed the link between ${quoted(p.fromTitle)} and ${quoted(p.toTitle)}.`,
      )
    case 'relabelRelation':
      return tr(
        `${who} memberi label ${p.label ?? 'kosong'} pada hubungan ${quoted(p.fromTitle)} dan ${quoted(p.toTitle)}.`,
        `${who} labelled the link between ${quoted(p.fromTitle)} and ${quoted(p.toTitle)} ${p.label ?? 'empty'}.`,
      )
    case 'addComment':
      return tr(`${who} berkomentar pada ${quoted(p.targetTitle)}.`, `${who} commented on ${quoted(p.targetTitle)}.`)
    case 'resolveComment':
      return tr(
        `${who} menyelesaikan komentar pada ${quoted(p.targetTitle)}.`,
        `${who} resolved a comment on ${quoted(p.targetTitle)}.`,
      )
    case 'setRoomTitle':
      return tr(`${who} mengubah nama ruang menjadi ${title}.`, `${who} renamed the room to ${title}.`)
    case 'setRoomShape': {
      const shape = SHAPE_LABEL[p.shape ?? 'mindmap'].toLowerCase()
      return tr(`${who} mengubah bentuk kanvas menjadi ${shape}.`, `${who} changed the canvas shape to ${shape}.`)
    }
    case 'cycleResolved':
      return tr(
        `Perpindahan bertabrakan. ${title} dikembalikan ke akar.`,
        `Two moves collided. ${title} was returned to the root.`,
      )
    case 'undo':
      return narrateUndo(who, p)
  }
}

/**
 * Undo needs its own sentence, not "perubahan dibatalkan".
 *
 * Rule 5 applies to reversing a change exactly as much as to making one: if a
 * person cannot hear what just came back, undo is a silent structural change --
 * which is the thing this product exists to prevent.
 */
function narrateUndo(who: string, p: DocEvent['payload']): string {
  const what = quoted(p.title)
  // One press, several changes: naming the last of them would describe a
  // fraction of what just disappeared from everyone else's canvas.
  if ((p.undoneCount ?? 1) > 1) {
    return tr(
      `${who} membatalkan ${p.undoneCount} perubahan terakhir sekaligus.`,
      `${who} undid the last ${p.undoneCount} changes at once.`,
    )
  }
  switch (p.undoneType) {
    case 'createNode':
      return tr(`${who} membatalkan penambahan ${what}.`, `${who} undid adding ${what}.`)
    case 'deleteNode':
      return tr(`${who} mengembalikan ${what}.`, `${who} restored ${what}.`)
    case 'moveNode':
    case 'reorderNode':
      return tr(`${who} mengembalikan ${what} ke tempat semula.`, `${who} put ${what} back where it was.`)
    case 'renameNode':
      return tr(`${who} mengembalikan judul ${what}.`, `${who} restored the title of ${what}.`)
    case 'setNodeKind':
    case 'setNodeState':
    case 'setNodeNote':
    case 'setNodeTool':
      return tr(`${who} mengembalikan ${what} seperti semula.`, `${who} restored ${what} to how it was.`)
    case 'voteNode':
      return tr(`${who} membatalkan pilihan yang baru diberikan.`, `${who} took back the vote just cast.`)
    case 'unvoteNode':
      return tr(`${who} mengembalikan pilihan yang tadi ditarik.`, `${who} restored the vote just withdrawn.`)
    case 'addRelation':
      return tr(`${who} membatalkan hubungan yang baru dibuat.`, `${who} undid the link just made.`)
    case 'removeRelation':
      return tr(`${who} mengembalikan hubungan yang tadi dilepas.`, `${who} restored the link just removed.`)
    case 'addComment':
      return tr(`${who} membatalkan komentar pada ${what}.`, `${who} undid the comment on ${what}.`)
    case 'resolveComment':
      return tr(`${who} membuka kembali komentar pada ${what}.`, `${who} reopened the comment on ${what}.`)
    case 'setRoomShape':
      return tr(`${who} mengembalikan bentuk kanvas.`, `${who} restored the canvas shape.`)
    case 'setRoomTitle':
      return tr(`${who} mengembalikan nama ruang.`, `${who} restored the room name.`)
    default:
      return tr(`${who} membatalkan perubahan terakhir.`, `${who} undid the last change.`)
  }
}

/**
 * Rule 9: audio is a scarce resource. A burst of changes becomes one sentence
 * instead of five, so the announcer never talks over the meeting.
 */
export function narrateBurst(events: DocEvent[], nameOf: (id: string) => string): string {
  if (events.length === 0) return ''
  if (events.length === 1) return narrate(events[0], nameOf(events[0].actorId))

  const actors = new Set(events.map((e) => e.actorId))
  const types = new Set(events.map((e) => e.type))
  const first = nameOf(events[0].actorId)

  if (actors.size === 1 && types.size === 1 && events[0].type === 'createNode') {
    return tr(`${first} menambahkan ${events.length} simpul.`, `${first} added ${events.length} nodes.`)
  }
  if (actors.size === 1) {
    return tr(`${first} membuat ${events.length} perubahan.`, `${first} made ${events.length} changes.`)
  }
  return tr(`${events.length} perubahan dari ${actors.size} orang.`, `${events.length} changes from ${actors.size} people.`)
}
