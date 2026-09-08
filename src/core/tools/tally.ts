/**
 * Votes, read back off the event log.
 *
 * There is no vote count stored on a node, and that is the point. A vote is
 * something a person did at a moment, which is exactly what the log already
 * records -- with an actor, a time and an input path. Deriving the tally
 * instead of storing it means four features arrive with no code of their own:
 * undo works, attribution works, the contribution summary counts voting as
 * participation, and review mode can replay a decision changing its mind.
 *
 * Voting is a toggle, so the last event by an actor on a node wins. Reading
 * backwards and stopping at the first match is both the cheapest way to do that
 * and the clearest to explain.
 */

import type { ActorId, NodeId, RoomDoc } from '../model/types'

/** The actor's standing vote, or null if they never touched this node. */
function latestVote(doc: RoomDoc, nodeId: NodeId, actorId: ActorId): boolean | null {
  for (let i = doc.events.length - 1; i >= 0; i -= 1) {
    const event = doc.events[i]
    if (event.payload.nodeId !== nodeId || event.actorId !== actorId) continue
    if (event.type === 'voteNode') return true
    if (event.type === 'unvoteNode') return false
  }
  return null
}

export function hasVoted(doc: RoomDoc, nodeId: NodeId, actorId: ActorId): boolean {
  return latestVote(doc, nodeId, actorId) === true
}

export function votersOf(doc: RoomDoc, nodeId: NodeId): ActorId[] {
  const seen = new Set<ActorId>()
  const voters: ActorId[] = []
  // Backwards, so the first time an actor appears is their standing vote.
  for (let i = doc.events.length - 1; i >= 0; i -= 1) {
    const event = doc.events[i]
    if (event.payload.nodeId !== nodeId) continue
    if (event.type !== 'voteNode' && event.type !== 'unvoteNode') continue
    if (seen.has(event.actorId)) continue
    seen.add(event.actorId)
    if (event.type === 'voteNode') voters.push(event.actorId)
  }
  return voters
}

export function countVotes(doc: RoomDoc, nodeId: NodeId): number {
  return votersOf(doc, nodeId).length
}

/** Every option under a tool node, tallied, highest first. Ties keep tree order. */
export function tallyOf(
  doc: RoomDoc,
  optionIds: readonly NodeId[],
): { id: NodeId; votes: number; voters: ActorId[] }[] {
  return optionIds
    .map((id) => {
      const voters = votersOf(doc, id)
      return { id, votes: voters.length, voters }
    })
    .sort((a, b) => b.votes - a.votes)
}
