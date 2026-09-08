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
import { templateById } from '../templates/registry'
import { planWithOllama } from './ollama'
import type { NodeId } from '../model/types'
import type { PlanInput, ProviderId } from './provider'
import type { Plan, PlanStep } from './types'

/**
 * Words that name a template.
 *
 * Bare "suara" used to be here and had to go: "suara mahasiswa di survei
 * kemarin cukup jelas" is a sentence about students, not a request for a
 * ballot. A trigger word that is also an ordinary word will fire on ordinary
 * speech, and a router that interrupts a meeting is worse than one that stays
 * quiet. The eval set caught it; nobody would have caught it by trying things.
 */
const NAMED: Record<string, string[]> = {
  voting: ['voting', 'vote', 'pemungutan suara', 'ambil suara'],
  retro: ['retro', 'retrospektif', 'mulai hentikan lanjutkan'],
  matriks: ['matriks', 'kuadran', 'dampak usaha', 'impact effort'],
  sprint: ['rencana sprint', 'sprint planning', 'perencanaan sprint'],
  lima_kenapa: ['lima kenapa', '5 kenapa', 'five whys', 'akar masalah'],
  parkir: ['tempat parkir', 'parking lot', 'parkir dulu'],
}

/**
 * A name alone is a mention; a name after a request is a request.
 *
 * "Catat bahwa retro kemarin sudah kita bahas" names retro and asks for
 * nothing. Requiring one of these words *before* the name is the cheapest
 * distinction that holds, and it matches how people actually ask for things.
 */
const ASKS = [
  'bikin', 'buat', 'buka', 'pakai', 'gunakan', 'siapkan', 'tolong',
  'mulai', 'pasang', 'coba', 'kasih', 'tambahkan alat', 'jalankan',
]

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
    // "prioritas" alone was here and fired on "prioritas kita semester ini
    // adalah aksesibilitas", which is a statement, not a request to sort
    // anything. What a matrix is actually for is the comparison.
    templateId: 'matriks',
    phrases: ['mana yang penting', 'dampaknya besar', 'usaha kecil', 'urutkan prioritas', 'dampak dan usaha'],
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

/** Which templates a sentence names, in the order they appear. */
export function namedIn(transcript: string): string[] {
  const text = normalise(transcript)
  return Object.entries(NAMED)
    .map(([id, words]) => {
      const at = words
        .map((word) => text.indexOf(normalise(word)))
        .filter((index) => index >= 0)
        .sort((a, b) => a - b)[0]
      return at === undefined ? null : ([id, at] as const)
    })
    .filter((hit): hit is readonly [string, number] => hit !== null)
    .sort((a, b) => a[1] - b[1])
    .map(([id]) => id)
}

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

/**
 * The provider chooses who answers; the shape of the answer never changes.
 *
 * A failing model falls back to the rule matcher rather than to nothing, and
 * says so in the reason -- silently degrading would let a demo look like a
 * local model was working when it was not.
 */
export async function planWith(provider: ProviderId, input: PlanInput): Promise<Plan> {
  if (provider !== 'ollama') return plan(input)
  try {
    return await planWithOllama(input)
  } catch (error) {
    const fallback = plan(input)
    return {
      ...fallback,
      reason: `Model lokal tidak menjawab (${
        error instanceof Error ? error.message : 'gagal'
      }), jadi ini hasil pencocokan aturan. ${fallback.reason}`,
    }
  }
}

export function plan(input: PlanInput): Plan {
  const text = normalise(input.transcript)
  const parentId = input.focusId

  // 1. Named outright.
  const named = Object.entries(NAMED)
    .map(([id, words]) => {
      const at = words
        .map((word) => text.indexOf(normalise(word)))
        .filter((index) => index >= 0)
        .sort((a, b) => a - b)[0]
      return at === undefined ? null : ([id, at] as const)
    })
    .filter((hit): hit is readonly [string, number] => hit !== null)

  /*
    Two names in one sentence is ambiguity whatever the verbs are, so this is
    checked before the request-word rule. Asking is the safe failure here;
    choosing for somebody is not (section 8).
  */
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

  if (named.length === 1) {
    const [id, at] = named[0]
    const asked = ASKS.some((word) => {
      const index = text.indexOf(normalise(word))
      return index >= 0 && index < at
    })
    const step = asked ? stepFor(id, parentId, 0.94) : null
    if (step) {
      return {
        intent: 'alat-diminta',
        reason: `Kamu menyebut ${step.source?.label} langsung, jadi tidak ada yang perlu ditebak.`,
        steps: [step],
      }
    }
    // Named without asking: a mention. Falls through to the structure stage.
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
