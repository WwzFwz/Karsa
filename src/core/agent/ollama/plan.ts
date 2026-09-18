/**
 * The local model as the orchestrator, behind the same seam as the rules.
 *
 * One call decides everything a sentence can mean: a tool, ordinary structure,
 * a question back to the speaker, or not a command at all. It used to be two
 * calls -- route, then structure -- and the probe of real phrasings showed the
 * rules in front of the model understood 6 of 26 ways people actually talk.
 * Keyword matching is not a floor anyone can stand on; it is now only a brake
 * and a fallback.
 *
 * What stays in code, because a 7B model cannot be trusted with it:
 *
 * 1. **Constrained decoding with a JSON schema** (section 8).
 * 2. **The model names nodes by title, never by id**, and code resolves them.
 * 3. **Grounding.** Every existing node a direct change points at must share a
 *    real word with what was said. The probe caught the model proposing to
 *    delete a node nobody named.
 * 4. **The two-tools brake** runs before the model is asked (D64).
 *
 * When the sentence is unclear the model asks, with options that each carry
 * their own operations. Options are not grounded -- the person picks one
 * explicitly, which is the confirmation -- but every option must still resolve
 * to real nodes or it is dropped.
 */

import { buildContext, renderContext } from '../context'
import { namedIn, plan } from '../orchestrator'
import type { Plan, PlanQuestion } from '../types'
import type { PlanInput } from '../provider'
import { templateById } from '../../templates/registry'
import { tr } from '../../i18n'
import { isMixedContent, ollamaModel, ollamaUrl } from '../../config'
import { SCHEMA, type ModelAnswer } from './schema'
import { systemPrompt } from './prompt'
import { buildSteps, targetOf, templateStep, twoToolsQuestion } from './answer'

const ENDPOINT = () => ollamaUrl()
const MODEL = () => ollamaModel()

export async function probeOllama(): Promise<{ ready: boolean; detail: string }> {
  const url = ollamaUrl()
  const model = ollamaModel()
  if (isMixedContent(url)) {
    return {
      ready: false,
      detail: tr(
        `Halaman ini https, tapi ${url} http. Peramban memblokirnya kecuali alamatnya localhost.`,
        `This page is https but ${url} is http. Browsers block that unless the address is localhost.`,
      ),
    }
  }
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2000)
    const response = await fetch(`${url}/api/tags`, { signal: controller.signal })
    clearTimeout(timer)
    if (response.status === 403) {
      return {
        ready: false,
        detail: tr(
          `Ollama menolak asal halaman ini. Jalankan ulang dengan OLLAMA_ORIGINS=${globalThis.location?.origin ?? '*'}`,
          `Ollama refused this page's origin. Restart it with OLLAMA_ORIGINS=${globalThis.location?.origin ?? '*'}`,
        ),
      }
    }
    if (!response.ok) return { ready: false, detail: `Ollama ${response.status}.` }
    const body = (await response.json()) as { models?: { name: string }[] }
    const names = (body.models ?? []).map((m) => m.name)
    if (!names.includes(model)) {
      return {
        ready: false,
        detail: tr(
          `Ollama jalan, tapi ${model} belum diunduh. Jalankan: ollama pull ${model}`,
          `Ollama is running, but ${model} is not pulled. Run: ollama pull ${model}`,
        ),
      }
    }
    return { ready: true, detail: tr(`${model}, lewat ${url}.`, `${model}, via ${url}.`) }
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === 'AbortError'
    return {
      ready: false,
      detail: aborted
        ? tr(`${url} tidak menjawab dalam 2 detik.`, `${url} did not answer within 2 seconds.`)
        : tr(
            `${url} tidak terjangkau. Pastikan Ollama jalan, dan bila halaman ini dari server, izinkan asalnya lewat OLLAMA_ORIGINS.`,
            `${url} is unreachable. Make sure Ollama is running, and if this page came from a server, allow its origin with OLLAMA_ORIGINS.`,
          ),
    }
  }
}

/** Whether a title shares at least one meaningful word with what was said. */

export async function planWithOllama(input: PlanInput): Promise<Plan> {
  // The brake is code, not prompt (D64).
  const named = namedIn(input.transcript)
  if (named.length > 1) return twoToolsQuestion(named, input)

  /*
    A tool named after a request word is not a judgement call, and the eval
    showed the model answering those with a question 7 times out of 7. Asking
    someone who just said "bikin voting" whether they meant voting is the
    opposite of understanding them, so this one is settled before the model.
    It is also three seconds faster.
  */
  if (!input.pending) {
    const ruled = plan(input)
    if (ruled.intent === 'alat-diminta') return ruled
  }

  const context = renderContext(buildContext(input.doc, input.tree, input.focusId))
  const said = input.pending ? `${input.pending.transcript} ${input.transcript}` : input.transcript
  const turn = input.pending
    ? `Ucapan awal: "${input.pending.transcript}"\nKamu bertanya: "${input.pending.question}"\nJawaban pengguna: "${input.transcript}"\nPutuskan lagi berdasarkan jawaban itu.`
    : `Ucapan: "${input.transcript}"`

  const response = await fetch(`${ENDPOINT()}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL(),
      stream: false,
      // Keep the model loaded between sentences in a meeting; reloading it is
      // most of the wait on a cold call.
      keep_alive: '30m',
      format: SCHEMA,
      options: { temperature: 0 },
      messages: [
        { role: 'system', content: systemPrompt() },
        { role: 'user', content: `Konteks ruang:\n${context}\n\n${turn}` },
      ],
    }),
  })
  if (!response.ok) throw new Error(`Ollama ${response.status}`)
  const payload = (await response.json()) as { message?: { content?: string } }
  const answer = JSON.parse(payload.message?.content ?? '{}') as ModelAnswer
  const why = answer.alasan?.trim() || tr('Model memutuskan dari maksud ucapan.', 'The model decided from what the sentence meant.')

  if (answer.maksud === 'alat') {
    const step = templateStep(answer.templat, answer.judul_alat ?? '', answer.disebut_langsung, input)
    const named = namedIn(input.transcript).includes(answer.templat)
    const shaped = plan(input).intent === 'alat-diusulkan'
    // Turned down once already, and not asked for by name this time: the offer
    // is dropped rather than repeated, and the sentence falls through to what
    // else it might mean.
    if (step && !named && input.declined?.includes(answer.templat)) {
      const others = buildSteps(answer.operasi, input, said)
      if (others.length > 0) return { intent: 'susun', reason: why, steps: others }
      return { intent: 'tak-dikenali', reason: why, steps: [], rawText: input.transcript }
    }
    if (step && (named || shaped)) {
      return { intent: named && answer.disebut_langsung ? 'alat-diminta' : 'alat-diusulkan', reason: why, steps: [step] }
    }
    /*
      A tool that was neither named nor has the shape of one in the sentence is
      the model reaching. Probes caught it turning "tambahkan ide..." into a
      vote. Reaching is allowed only as a question: the tool is offered, and
      whatever else the model understood stays offered next to it.
    */
    if (step && step.source) {
      const others = buildSteps(answer.operasi, input, said)
      return {
        intent: 'tanya',
        reason: why,
        steps: [],
        question: {
          question: tr(`Mau pakai ${step.source.label.toLowerCase()}?`, `Use ${step.source.label.toLowerCase()}?`),
          choices: [
            { id: step.source.id, label: tr(`Ya, siapkan ${step.source.label.toLowerCase()}`, `Yes, set up ${step.source.label.toLowerCase()}`), commands: step.commands },
            ...others.map((o, i) => ({ id: `isi_${i}`, label: o.preview, commands: o.commands, targetId: targetOf(o.commands) })),
          ],
        },
      }
    }
  }

  if (answer.maksud === 'susun') {
    const steps = buildSteps(answer.operasi, input, said)
    if (steps.length > 0) return { intent: 'susun', reason: why, steps }
    // The model was sure; the code could not ground it. If the sentence has
    // the shape of a tool, that is the better reading; otherwise ask.
    const implied = plan(input)
    if (implied.intent === 'alat-diusulkan') return implied
    return {
      intent: 'tanya',
      reason: tr(
        'Model memahami ini sebagai perintah, tapi simpul yang dituju tidak cocok dengan yang diucapkan.',
        'The model read this as a command, but the node it pointed at does not match what was said.',
      ),
      steps: [],
      question: {
        question: tr('Simpul mana yang dimaksud? Sebutkan judulnya.', 'Which node do you mean? Say its title.'),
        choices: [],
      },
    }
  }

  if (answer.maksud === 'tanya') {
    const choices: PlanQuestion['choices'] = []
    const implied = plan(input)
    // Same rule as the tool route, plus: a board turned down earlier does not
    // come back as an option either. Naming it still does.
    const toolAllowed = (id: string) =>
      namedIn(input.transcript).includes(id) ||
      (!input.declined?.includes(id) && implied.steps[0]?.source?.id === id)
    for (const [i, option] of (answer.opsi ?? []).entries()) {
      // A filled-in operation wins over a template: the model fills required
      // fields it has no use for, and an option labelled "as an idea" with a
      // title in it is an idea, whatever its template field says.
      const hasOp = Boolean(option.judul?.trim() || option.sasaran?.trim())
      const spec = !hasOp && option.templat && option.templat !== 'none' ? templateById(option.templat) : null
      // Same rule as the tool route: an option may offer a tool only when the
      // sentence named it or has its shape. "Keputusan" is not a request to vote.
      if (spec && !toolAllowed(spec.id)) continue
      const commands = spec
        ? templateStep(spec.id, '', true, input)?.commands ?? []
        : buildSteps([option], input, null).flatMap((step) => step.commands)
      if (commands.length === 0 || !option.label?.trim()) continue
      const id = spec ? spec.id : `pilihan_${i}`
      if (choices.some((c) => c.id === id)) continue
      // A tool option says it is a tool. The model once labelled a lima-kenapa
      // template "Faktor eksternal", and a label that hides what a click does
      // is the one thing an option must never be.
      const label = spec ? tr(`Pakai alat ${spec.label.toLowerCase()}`, `Use the ${spec.label.toLowerCase()} tool`) : option.label.trim()
      choices.push({ id, label, commands, targetId: targetOf(commands) })
    }
    /*
      The model tends to ask about content where the sentence has the shape of
      a tool ("kenapa bisa...", "apa yang jalan..."). The rules know those
      shapes; when they see one, the tool joins the options rather than being
      lost. The person still decides.
    */
    if (implied.intent === 'alat-diusulkan' && implied.steps[0]?.source) {
      const source = implied.steps[0].source
      if (!choices.some((c) => c.id === source.id)) {
        if (choices.length >= 4) choices.pop()
        choices.unshift({
          id: source.id,
          label: tr(`Pakai alat ${source.label.toLowerCase()}`, `Use the ${source.label.toLowerCase()} tool`),
          commands: implied.steps[0].commands,
        })
      }
    }
    /*
      A question with one real answer is a proposal wearing a question mark.
      "Should I add teacher training?" with the only option "yes, add it" is
      exactly what the proposal card already asks, with Apply and Cancel, so it
      is shown as that instead of costing an extra step.
    */
    if (choices.length === 1) {
      const only = (answer.opsi ?? []).find((o) => o.label.trim() === choices[0].label)
      const step = only && (!only.templat || only.templat === 'none') ? buildSteps([only], input, null)[0] : null
      if (step) return { intent: 'susun', reason: why, steps: [{ ...step, confidence: Math.min(step.confidence, 0.6) }] }
      if (templateById(choices[0].id)) {
        const tool = templateStep(choices[0].id, '', false, input)
        if (tool) return { intent: 'alat-diusulkan', reason: why, steps: [tool] }
      }
    }
    return {
      intent: 'tanya',
      reason: why,
      steps: [],
      question: {
        question: answer.pertanyaan?.trim() || tr('Maksudnya yang mana?', 'Which do you mean?'),
        choices,
      },
    }
  }

  // Not a command. A name that is actually present still wins: a keyword that
  // is there is not a judgement call (rules as the floor, D64).
  if (named.length === 1) {
    const fromRules = plan(input)
    if (fromRules.steps.length > 0) return fromRules
  }
  return { intent: 'tak-dikenali', reason: why, steps: [], rawText: input.transcript }
}
