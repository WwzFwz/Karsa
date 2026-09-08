/**
 * The orchestrator: one utterance in, a plan out.
 *
 * The body is a keyword matcher. The *signature* is the real thing, and that is
 * deliberate -- everything downstream reads `Plan` and nothing else, so the day
 * this becomes schema-constrained decoding against a local model, it is one
 * function body and no other file.
 *
 * Three routes, in order, because the cheap certain one must win over the clever
 * uncertain one:
 *
 *   1. The person named a tool or template. Nothing to infer.
 *   2. The sentence has the shape of one -- "mana yang duluan", "kenapa bisa".
 *      Proposed at lower confidence, and still through the gate.
 *   3. Ordinary content, handed to the structure stage.
 *
 * When two readings are equally good it asks. Section 8 is not negotiable here:
 * the system never guesses on a canvas that belongs to everybody.
 */

import { expandTemplate, templateSize } from '../templates/expand'
import { TEMPLATES, templateById } from '../templates/registry'
import type { NodeId, RoomDoc } from '../model/types'
import type { Plan, PlanStep } from './types'

export interface PlanInput {
  transcript: string
  doc: RoomDoc
  focusId: NodeId | null
}

/** Words that name a template outright. */
const NAMED: Record<string, string[]> = {
  voting: ['voting', 'vote', 'pemungutan suara', 'suara'],
  retro: ['retro', 'retrospektif', 'mulai hentikan lanjutkan'],
  matriks: ['matriks', 'kuadran', 'dampak usaha', 'impact effort'],
  sprint: ['rencana sprint', 'sprint planning', 'perencanaan sprint'],
  lima_kenapa: ['lima kenapa', '5 kenapa', 'five whys', 'akar masalah'],
  parkir: ['tempat parkir', 'parking lot', 'parkir dulu'],
}

/**
 * Sentences that ask for a tool without naming one. Kept small and honest: a
 * long list of guesses is a long list of ways to be confidently wrong.
 */
const IMPLIED: { templateId: string; phrases: string[]; because: string }[] = [
  {
    templateId: 'voting',
    phrases: ['mana yang duluan', 'kita pilih', 'harus diputuskan', 'suara terbanyak', 'sepakat yang mana'],
    because: 'kalimatnya meminta keputusan bersama',
  },
  {
    templateId: 'matriks',
    phrases: ['prioritas', 'mana yang penting', 'dampaknya besar', 'usaha kecil'],
    because: 'kalimatnya membandingkan dampak dan usaha',
  },
  {
    templateId: 'lima_kenapa',
    phrases: ['kenapa bisa', 'akar masalahnya', 'penyebabnya apa'],
    because: 'kalimatnya menelusuri sebab',
  },
  {
    templateId: 'retro',
    phrases: ['apa yang jalan', 'apa yang tidak jalan', 'evaluasi sprint'],
    because: 'kalimatnya mengevaluasi cara kerja',
  },
]

function normalise(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function stepFor(templateId: string, parentId: NodeId | null, confidence: number): PlanStep | null {
  const spec = templateById(templateId)
  if (!spec) return null
  const built = spec.build()
  return {
    agent: 'pemilih',
    preview: `Siapkan ${spec.label.toLowerCase()}: ${templateSize(built)} simpul di bawah induk terpilih.`,
    confidence,
    commands: expandTemplate(built, parentId),
    source: { kind: spec.id === 'voting' ? 'alat' : 'templat', id: spec.id, label: spec.label },
  }
}

export function plan(input: PlanInput): Plan {
  const text = normalise(input.transcript)
  const parentId = input.focusId

  // 1. Named outright.
  const named = Object.entries(NAMED).filter(([, words]) =>
    words.some((word) => text.includes(normalise(word))),
  )

  if (named.length === 1) {
    const step = stepFor(named[0][0], parentId, 0.94)
    if (step) {
      return {
        intent: 'alat-diminta',
        reason: `Kamu menyebut ${step.source?.label} langsung, jadi tidak ada yang perlu ditebak.`,
        steps: [step],
      }
    }
  }

  // Two names in one sentence is exactly the case that must not be guessed.
  if (named.length > 1) {
    return {
      intent: 'ambigu',
      reason: 'Dua alat disebut dalam satu kalimat.',
      steps: [],
      question: {
        question: `Yang mana dulu: ${named
          .map(([id]) => templateById(id)?.label ?? id)
          .join(' atau ')}?`,
        choices: named.flatMap(([id]) => {
          const spec = templateById(id)
          if (!spec) return []
          return [{ id, label: spec.label, commands: expandTemplate(spec.build(), parentId) }]
        }),
      },
    }
  }

  // 2. Implied by the shape of the sentence. Lower confidence on purpose.
  const implied = IMPLIED.find((rule) =>
    rule.phrases.some((phrase) => text.includes(normalise(phrase))),
  )
  if (implied) {
    const step = stepFor(implied.templateId, parentId, 0.58)
    if (step) {
      return {
        intent: 'alat-diusulkan',
        reason: `Kamu tidak menyebut alatnya, tapi ${implied.because}. Ini usulan, bukan keputusan.`,
        steps: [step],
      }
    }
  }

  // 3. Not a tool request. The caller falls back to the structure stage.
  return {
    intent: 'susun',
    reason: 'Tidak ada alat yang diminta; ini isi biasa.',
    steps: [],
  }
}

/** Everything the orchestrator knows how to be asked for, for the help panel. */
export function askableTemplates(): { id: string; label: string; say: string }[] {
  return TEMPLATES.map((template) => ({
    id: template.id,
    label: template.label,
    say: `"bikin ${template.label.toLowerCase()}"`,
  }))
}
