/**
 * What the orchestrator produces, and who produced each part of it.
 *
 * This file is the seam. Today `plan()` is a keyword matcher; tomorrow it is
 * schema-constrained decoding against a local model. Everything downstream --
 * the draft panel, the agent cursor, the apply performance -- reads this shape
 * and nothing else, so swapping the engine is one implementation rather than a
 * rewrite. That is the whole reason to build the seam before the model.
 *
 * "Multi-agent" here is not a swarm and not theatre. It is the pipeline given
 * names, so a step can say which stage produced it: the one that finds
 * structure, the one that picks a tool, the one that tidies wording. Naming
 * them is what turns an opaque answer into something a person can disagree with
 * one part of.
 */

import type { Command } from '../commands/types'

export type AgentId = 'penyusun' | 'pemilih' | 'perapi'

export interface AgentSpec {
  id: AgentId
  label: string
  /** What this stage is responsible for, in one line. */
  duty: string
}

export const AGENTS: Record<AgentId, AgentSpec> = {
  penyusun: {
    id: 'penyusun',
    label: 'Penyusun struktur',
    duty: 'Mengubah ucapan jadi simpul bertipe dan menempatkannya di pohon.',
  },
  pemilih: {
    id: 'pemilih',
    label: 'Pemilih alat',
    duty: 'Menentukan apakah yang diminta lebih tepat jadi alat atau templat.',
  },
  perapi: {
    id: 'perapi',
    label: 'Perapi judul',
    duty: 'Memendekkan judul supaya muat satu tarikan napas (aturan 4).',
  },
}

/** Why the orchestrator routed an utterance the way it did. */
export type Intent =
  /** Named a tool or template outright: "bikin voting". */
  | 'alat-diminta'
  /** Did not name one, but the shape of the sentence asks for one. */
  | 'alat-diusulkan'
  /** Ordinary content: add, rename, move. */
  | 'susun'
  /** Two readings, both plausible. Ask; never guess on a shared canvas. */
  | 'ambigu'
  /** Nothing usable. Show the words, do not invent an operation. */
  | 'tak-dikenali'

export interface PlanStep {
  agent: AgentId
  /** One sentence, before it happens. Rule 5 applies to proposals too. */
  preview: string
  /** 0..1. Under 0.6 the panel marks it as needing a look. */
  confidence: number
  /** Several commands when the step is a template; they land as one gesture. */
  commands: Command[]
  /** Where it came from, when it came from the registry. */
  source?: { kind: 'templat' | 'alat'; id: string; label: string }
}

export interface PlanQuestion {
  question: string
  choices: { id: string; label: string; commands: Command[] }[]
}

export interface Plan {
  intent: Intent
  /** The sentence the orchestrator would say about its own routing. */
  reason: string
  steps: PlanStep[]
  question?: PlanQuestion
  /** Speech that produced nothing. Editable, never applied silently. */
  rawText?: string
}
