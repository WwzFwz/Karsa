/**
 * Where the plan comes from.
 *
 * Two implementations, one interface, and the interface is the point (D45).
 * `rules` is a keyword matcher that always works, needs nothing installed and
 * runs in a classroom with no network. `ollama` is a real local model with
 * JSON-schema constrained decoding. Neither is allowed to be a silent fallback
 * for the other: which one answered is shown, because "the assistant did
 * something" and "a 7B model on this laptop did something" are not the same
 * claim and a person is entitled to know which they are looking at.
 *
 * A cloud provider would go here too and would stay switched off by default
 * (section 8). It is not built, and nothing about this interface makes it
 * easier to sneak one in: the caller picks a provider, and the badge changes.
 */

import type { Plan } from './types'
import type { NodeId, RoomDoc } from '../model/types'
import type { TreeProjection } from '../tree/project'

export type ProviderId = 'rules' | 'ollama'

export interface PlanInput {
  transcript: string
  doc: RoomDoc
  tree: TreeProjection
  focusId: NodeId | null
  /**
   * Set when this sentence answers a question the assistant just asked, so
   * the model decides again with the question and the first sentence in view.
   */
  pending?: { question: string; transcript: string }
  /**
   * Tools this person already turned down in this session, and did not ask for
   * by name when they did.
   *
   * Offering the same board again after it has been refused is the assistant
   * arguing, and an interruption is paid for by everyone in the meeting (D63).
   * It only silences the *unasked* offer: naming a tool outright still gets it,
   * because a refusal is an answer to a suggestion, not a ban on a word.
   */
  declined?: readonly string[]
}

export interface PlanProvider {
  id: ProviderId
  label: string
  /** Where the words go. The only line that matters in a provider list (D24). */
  destination: string
  /** Cheap check. Never blocks the interface waiting for a model. */
  probe: () => Promise<{ ready: boolean; detail: string }>
  plan: (input: PlanInput) => Promise<Plan>
}

const KEY = 'karsa:penyedia'

export function readProvider(): ProviderId {
  try {
    const value = localStorage.getItem(KEY)
    if (value === 'ollama' || value === 'rules') return value
  } catch {
    // Blocked storage; use the default.
  }
  // The model is the orchestrator (D70). Rules are the fallback when it is not
  // running, and the reason says so.
  return 'ollama'
}

export function writeProvider(id: ProviderId): void {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    // Not remembering the choice is survivable; it is one click to make again.
  }
}
