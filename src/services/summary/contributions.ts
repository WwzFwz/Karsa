/**
 * Contribution share, computed from the event log rather than from the current
 * document. Counting nodes would credit whoever happens to own something now;
 * counting events credits whoever did the work, including work that was later
 * moved, renamed or deleted by someone else.
 *
 * The input path breakdown is the part that matters for this product: it shows
 * that a person who cannot use a mouse contributed by speaking, and that the
 * share is real rather than ceremonial.
 */

import { CONTRIBUTING_EVENTS, type DocEvent, type EventType } from '../../core/events/types'
import type { InputPath, RoomDoc } from '../../core/model/types'

export interface ContributionRow {
  actorId: string
  displayName: string
  hue: number
  total: number
  share: number
  byPath: Record<InputPath, number>
  byType: Partial<Record<EventType, number>>
  firstAt: number
  lastAt: number
}

export interface ContributionSummary {
  rows: ContributionRow[]
  total: number
  startedAt: number
  endedAt: number
  byPath: Record<InputPath, number>
  /** Nodes still carrying an unanswered question, surfaced as loose ends. */
  openQuestions: { id: string; title: string }[]
  openActions: { id: string; title: string }[]
  unresolvedComments: number
}

const EMPTY_PATHS = (): Record<InputPath, number> => ({ keyboard: 0, voice: 0, pointer: 0, system: 0 })

export function summarise(doc: RoomDoc): ContributionSummary {
  // Work that was taken back does not count. Undo events name the event they
  // reversed, so the tally stays honest without rewriting the log.
  const undone = new Set(
    doc.events
      .filter((e) => e.type === 'undo' && e.payload.undoneEventId)
      .map((e) => e.payload.undoneEventId as string),
  )
  const relevant = doc.events.filter(
    (e) => CONTRIBUTING_EVENTS.includes(e.type) && !undone.has(e.id),
  )
  const byActor = new Map<string, ContributionRow>()

  for (const event of relevant) {
    const actor = doc.actors[event.actorId]
    let row = byActor.get(event.actorId)
    if (!row) {
      row = {
        actorId: event.actorId,
        displayName: actor?.displayName ?? 'Seseorang',
        hue: actor?.hue ?? 0,
        total: 0,
        share: 0,
        byPath: EMPTY_PATHS(),
        byType: {},
        firstAt: event.at,
        lastAt: event.at,
      }
      byActor.set(event.actorId, row)
    }
    row.total += 1
    row.byPath[event.inputPath] += 1
    row.byType[event.type] = (row.byType[event.type] ?? 0) + 1
    row.firstAt = Math.min(row.firstAt, event.at)
    row.lastAt = Math.max(row.lastAt, event.at)
  }

  const total = relevant.length || 1
  const rows = [...byActor.values()]
    .map((r) => ({ ...r, share: r.total / total }))
    .sort((a, b) => b.total - a.total)

  const byPath = EMPTY_PATHS()
  for (const e of relevant) byPath[e.inputPath] += 1

  const nodes = Object.values(doc.nodes)

  return {
    rows,
    total: relevant.length,
    startedAt: relevant.length ? Math.min(...relevant.map((e) => e.at)) : doc.room.createdAt,
    endedAt: relevant.length ? Math.max(...relevant.map((e) => e.at)) : doc.room.createdAt,
    byPath,
    openQuestions: nodes.filter((n) => n.kind === 'question').map((n) => ({ id: n.id, title: n.title })),
    openActions: nodes
      .filter((n) => n.kind === 'action' && n.state !== 'done')
      .map((n) => ({ id: n.id, title: n.title })),
    unresolvedComments: Object.values(doc.comments).filter((c) => !c.resolvedAt).length,
  }
}

export function timelineBuckets(events: DocEvent[], buckets = 12): number[] {
  if (events.length === 0) return new Array(buckets).fill(0)
  const start = Math.min(...events.map((e) => e.at))
  const end = Math.max(...events.map((e) => e.at))
  const span = Math.max(end - start, 1)
  const out = new Array(buckets).fill(0)
  for (const e of events) {
    const index = Math.min(buckets - 1, Math.floor(((e.at - start) / span) * buckets))
    out[index] += 1
  }
  return out
}
