/**
 * The draft. Local, never synced, owned by whoever spoke (rule 8).
 *
 * Nothing in here can reach the shared canvas until a person presses Terapkan.
 * The system is never allowed to guess on someone else's document: when it is
 * unsure it asks, and when it understands nothing it shows the words as plain
 * editable text instead of inventing an operation.
 */

import type { Command } from '../../core/commands/types'
import type { AgentId, Intent } from '../../core/agent/types'

export type DraftStatus =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'ready'
  /** Accepted operations are landing one at a time, with the cursor visiting each. */
  | 'applying'
  | 'applied'
  | 'discarded'

export interface DraftOperation {
  id: string
  command: Command
  /** One sentence describing what this will do, before it does it. */
  preview: string
  /** 0..1 from the parser. Anything under 0.6 is shown as needing a look. */
  confidence: number
  /** Unchecked operations are skipped on Terapkan. */
  accepted: boolean
  /** Which stage of the pipeline produced this. Named so it can be argued with. */
  agent?: AgentId
  /** Set when the step came from the tool or template registry. */
  source?: { kind: 'templat' | 'alat'; id: string; label: string }
  /**
   * A template arrives as several commands but one decision, so it is one row
   * with one checkbox -- ticking half a retro board is not a thing anyone means.
   */
  extraCommands?: Command[]
}

export interface DraftAmbiguity {
  id: string
  question: string
  choices: { id: string; label: string; command: Command }[]
}

export interface Draft {
  id: string
  status: DraftStatus
  /** Streamed word by word, which is what makes three seconds feel like none. */
  transcript: string
  operations: DraftOperation[]
  ambiguities: DraftAmbiguity[]
  /** Speech the parser could not turn into an operation. Editable, never applied silently. */
  rawText: string | null
  startedAt: number
  /** How the orchestrator routed this utterance, and why. */
  intent?: Intent
  reason?: string
  /**
   * Exactly what the assistant was told before it answered, as text. Shown
   * rather than described: "trust me" is not an accessibility feature.
   */
  context?: string
}
