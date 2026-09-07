/**
 * One event, one Indonesian sentence.
 *
 * This file is the executable form of rule 5. If a new operation cannot be
 * given a sentence here, the operation must not exist -- do not reach for a
 * generic fallback string to get around it.
 *
 * The same sentence is used by the screen reader announcer, the event log panel
 * and review mode, so the three can never drift apart.
 */

import { KIND_LABEL, RELATION_LABEL, SHAPE_LABEL, STATE_LABEL } from '../../ui/labels'
import type { DocEvent } from './types'

function actor(name: string): string {
  return name
}

function quoted(title: string | undefined): string {
  return title ? title : 'simpul tanpa judul'
}

export function narrate(event: DocEvent, actorName: string): string {
  const who = actor(actorName)
  const p = event.payload

  switch (event.type) {
    case 'createNode':
      return p.parentTitle
        ? `${who} menambahkan ${KIND_LABEL[p.kind ?? 'idea']} ${quoted(p.title)} di bawah ${quoted(p.parentTitle)}.`
        : `${who} menambahkan ${KIND_LABEL[p.kind ?? 'idea']} ${quoted(p.title)} di akar.`
    case 'renameNode':
      return `${who} mengubah judul ${quoted(p.previousTitle)} menjadi ${quoted(p.title)}.`
    case 'setNodeKind':
      return `${who} mengubah ${quoted(p.title)} menjadi ${KIND_LABEL[p.kind ?? 'idea']}.`
    case 'setNodeState':
      return `${who} menandai ${quoted(p.title)} ${STATE_LABEL[p.state ?? 'open'].toLowerCase()}.`
    case 'setNodeNote':
      return `${who} menyunting catatan pada ${quoted(p.title)}.`
    case 'moveNode':
      return p.parentTitle
        ? `${who} memindahkan ${quoted(p.title)} ke bawah ${quoted(p.parentTitle)}.`
        : `${who} memindahkan ${quoted(p.title)} ke akar.`
    case 'reorderNode':
      return `${who} memindahkan ${quoted(p.title)} ke urutan ${p.position ?? 1}.`
    case 'deleteNode': {
      const n = p.descendantCount ?? 0
      return n > 0
        ? `${who} menghapus ${quoted(p.title)} beserta ${n} turunannya.`
        : `${who} menghapus ${quoted(p.title)}.`
    }
    case 'addRelation':
      return `${who} menghubungkan ${quoted(p.fromTitle)} ${RELATION_LABEL[p.relationKind ?? 'refers_to']} ${quoted(p.toTitle)}.`
    case 'removeRelation':
      return `${who} melepas hubungan ${quoted(p.fromTitle)} dan ${quoted(p.toTitle)}.`
    case 'relabelRelation':
      return `${who} memberi label ${p.label ?? 'kosong'} pada hubungan ${quoted(p.fromTitle)} dan ${quoted(p.toTitle)}.`
    case 'addComment':
      return `${who} berkomentar pada ${quoted(p.targetTitle)}.`
    case 'resolveComment':
      return `${who} menyelesaikan komentar pada ${quoted(p.targetTitle)}.`
    case 'setRoomTitle':
      return `${who} mengubah nama ruang menjadi ${quoted(p.title)}.`
    case 'setRoomShape':
      return `${who} mengubah bentuk kanvas menjadi ${SHAPE_LABEL[p.shape ?? 'mindmap'].toLowerCase()}.`
    case 'cycleResolved':
      return `Perpindahan bertabrakan. ${quoted(p.title)} dikembalikan ke akar.`
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
  switch (p.undoneType) {
    case 'createNode':
      return `${who} membatalkan penambahan ${what}.`
    case 'deleteNode':
      return `${who} mengembalikan ${what}.`
    case 'moveNode':
    case 'reorderNode':
      return `${who} mengembalikan ${what} ke tempat semula.`
    case 'renameNode':
      return `${who} mengembalikan judul ${what}.`
    case 'setNodeKind':
    case 'setNodeState':
    case 'setNodeNote':
      return `${who} mengembalikan ${what} seperti semula.`
    case 'addRelation':
      return `${who} membatalkan hubungan yang baru dibuat.`
    case 'removeRelation':
      return `${who} mengembalikan hubungan yang tadi dilepas.`
    case 'addComment':
      return `${who} membatalkan komentar pada ${what}.`
    case 'resolveComment':
      return `${who} membuka kembali komentar pada ${what}.`
    case 'setRoomShape':
      return `${who} mengembalikan bentuk kanvas.`
    case 'setRoomTitle':
      return `${who} mengembalikan nama ruang.`
    default:
      return `${who} membatalkan perubahan terakhir.`
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

  if (actors.size === 1 && types.size === 1 && events[0].type === 'createNode') {
    return `${nameOf(events[0].actorId)} menambahkan ${events.length} simpul.`
  }
  if (actors.size === 1) {
    return `${nameOf(events[0].actorId)} membuat ${events.length} perubahan.`
  }
  return `${events.length} perubahan dari ${actors.size} orang.`
}
