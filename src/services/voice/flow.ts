/**
 * The voice flow of one person, on one device.
 *
 * Not turn-taking between people: everyone in a room can speak or type at the
 * same time, each on their own device, and their changes meet in the shared
 * document. This file only tracks where *this* person's own request is:
 *
 *   idle -> listening -> thinking -> ready -> applying -> applied
 *                                     |  \-> discarded
 *                                     \-> (answered by the next sentence)
 *
 * Plain TypeScript with its dependencies passed in, so it runs in node under
 * test with a fake microphone, a fake model and fake timers. React only
 * subscribes to it and draws.
 *
 * Two rules it exists to keep:
 *
 * - **The latest request wins.** Every new request bumps `turn`; an answer that
 *   comes back for an older one is dropped. A model takes seconds, and without
 *   this a slow answer to a sentence the person already replaced would land on
 *   top of the new one.
 * - **Nothing reaches the canvas without a decision** (rule 8): a proposal waits
 *   for Apply, a spoken "ya", or a picked option.
 */

import type { Command } from '../../core/commands/types'
import { tr } from '../../core/i18n'
import type { InputPath } from '../../core/model/types'
import { pickChoice, readAnswer } from './answers'
import { CONFIRM_UTTERANCE, emptyDraft, type Utterance } from './pipeline'
import type { Draft, DraftOperation } from './types'

/** A short press latches the microphone on; a longer one is push-to-talk (D4b). */
export const LATCH_MS = 400

type Via = 'voice' | 'keyboard'

/** The question an answer refers back to, sent to the model with the answer (D71). */
export interface Pending {
  question: string
  transcript: string
}

export interface RecogniserPort {
  readonly listening: boolean
  isReady(): boolean
  load(model: string): void
  start(onPartial: (text: string) => void): Promise<void>
  stop(): Promise<{ text: string; error?: string }>
  cancel(): void
}

export interface VoiceFlowDeps {
  recogniser: RecogniserPort
  /** The speech model to use, or undefined when this device plays canned lines. */
  asrModel(): string | undefined
  nextCannedUtterance(): Utterance
  /** Words, or a canned line, into a proposal -- reading the room as it is now. */
  understand(input: string | Utterance, pending?: Pending): Promise<Draft>
  runCommand(command: Command, via: InputPath): void
  runBatch(commands: Command[], via: InputPath): { ok: true } | { ok: false; message: string }
  announce(text: string, politeness?: 'polite' | 'assertive'): void
  earcon(name: 'draftReady' | 'createNode' | 'blocked'): void
  /** Marks this person as speaking: holds narration back and shows it to others. */
  setSpeaking(active: boolean): void
  reportError(message: string): void
  now(): number
  /** Runs `fn` after `ms`; returns a function that cancels it. */
  after(ms: number, fn: () => void): () => void
}

export interface VoiceState {
  draft: Draft
  talking: boolean
  latched: boolean
  /** Accepted operations landing one at a time (D23). */
  performing: { index: number; ops: DraftOperation[] } | null
}

export class VoiceFlow {
  private state: VoiceState = { draft: emptyDraft(), talking: false, latched: false, performing: null }
  private readonly listeners = new Set<() => void>()

  private turn = 0
  private pressedAt = 0
  /** Set when the talk switch went on while a proposal was waiting. */
  private answering = false
  private cannedLine: Utterance | null = null
  private cancelTimer: (() => void) | null = null

  constructor(private readonly deps: VoiceFlowDeps) {}

  // --- subscription ---------------------------------------------------------

  getState = (): VoiceState => this.state

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  dispose(): void {
    this.clearTimer()
    this.deps.recogniser.cancel()
    this.listeners.clear()
  }

  // --- the talk switch --------------------------------------------------------

  press = (): void => {
    if (this.state.talking) {
      // A second tap on a latched microphone ends the request.
      if (this.state.latched) this.stop()
      return
    }
    this.turn += 1
    this.pressedAt = this.deps.now()
    this.answering = this.state.draft.status === 'ready'
    this.update({ talking: true, latched: false })
    this.deps.setSpeaking(true)

    // While answering, the proposal stays on screen: clearing it would take the
    // thing being answered away just as the person answers it.
    this.editDraft(
      this.answering
        ? { ...this.state.draft, transcript: '' }
        : { ...emptyDraft(), status: 'listening', transcript: '' },
    )

    const model = this.deps.asrModel()
    if (model) this.listen(model)
    else this.playCannedLine()
  }

  release = (): void => {
    if (!this.state.talking) return
    if (this.deps.now() - this.pressedAt < LATCH_MS) {
      this.update({ latched: true })
      this.deps.announce(tr('Mikrofon tetap hidup. Ketuk sekali lagi untuk berhenti.', 'Microphone stays on. Tap again to stop.'))
      return
    }
    this.stop()
  }

  stop = (): void => {
    if (!this.state.talking) return
    this.update({ talking: false, latched: false })
    this.deps.setSpeaking(false)
    this.clearTimer()

    const answering = this.answering
    this.answering = false
    if (this.deps.recogniser.listening) void this.finishListening(answering)
    else this.finishCannedLine(answering)
  }

  // --- typed input --------------------------------------------------------------

  /** A typed sentence goes through exactly the same understanding as a spoken one (D68). */
  submitText = (text: string): void => {
    const trimmed = text.trim()
    if (!trimmed || this.state.talking) return
    void this.hear(trimmed, this.state.draft.status === 'ready', 'keyboard')
  }

  // --- deciding on a proposal ---------------------------------------------------

  /** For edits made by hand in the panel: unticking an operation, fixing raw text. */
  editDraft = (draft: Draft): void => {
    this.update({ draft })
  }

  apply = (): void => {
    const ops = this.state.draft.operations.filter((op) => op.accepted)
    if (ops.length === 0) return
    this.update({ draft: { ...this.state.draft, status: 'applying' }, performing: { index: 0, ops } })
    this.performNextStep()
  }

  discard = (): void => {
    // Anything still thinking belongs to the proposal being thrown away.
    this.turn += 1
    this.update({ draft: { ...this.state.draft, status: 'discarded' } })
    this.deps.announce(tr('Draf dibatalkan. Kanvas tidak berubah.', 'Draft discarded. The canvas did not change.'))
  }

  /** Picking an option is the confirmation; it applies straight away and can be undone (D71). */
  choose = (ambiguityId: string, choiceId: string, via: InputPath = 'pointer'): void => {
    const draft = this.state.draft
    const question = draft.ambiguities.find((a) => a.id === ambiguityId)
    const choice = question?.choices.find((c) => c.id === choiceId)
    if (!question || !choice) return

    const result = this.deps.runBatch(choice.commands, via)
    if (!result.ok) {
      this.deps.reportError(result.message)
      this.deps.announce(result.message, 'assertive')
      return
    }
    this.deps.earcon('createNode')
    this.deps.announce(tr(`Dipilih: ${choice.label}. Diterapkan.`, `Chosen: ${choice.label}. Applied.`), 'assertive')

    const remaining = draft.ambiguities.filter((a) => a.id !== ambiguityId)
    const done = remaining.length === 0 && draft.operations.length === 0
    this.update({ draft: { ...draft, ambiguities: remaining, status: done ? 'applied' : draft.status } })
  }

  // --- listening ----------------------------------------------------------------

  private listen(model: string): void {
    const { recogniser } = this.deps
    if (!recogniser.isReady()) {
      recogniser.load(model)
      this.deps.announce(
        tr('Menyiapkan pengenalan suara di perangkat. Silakan mulai bicara.', 'Preparing on-device speech recognition. Go ahead and speak.'),
      )
    }
    recogniser
      .start((partial) => this.editDraft({ ...this.state.draft, transcript: partial }))
      .catch((error: Error) => {
        this.update({ talking: false, latched: false })
        this.deps.setSpeaking(false)
        if (!this.answering) this.editDraft(emptyDraft())
        this.answering = false
        this.deps.reportError(error.message)
        this.deps.announce(error.message, 'assertive')
      })
  }

  private async finishListening(answering: boolean): Promise<void> {
    const turn = this.turn
    if (!answering) this.editDraft({ ...this.state.draft, status: 'thinking' })

    const heard = await this.deps.recogniser.stop()
    if (turn !== this.turn) return
    if (!heard.text) {
      if (!answering) this.editDraft(emptyDraft())
      this.deps.announce(heard.error ?? tr('Tidak ada kata yang terdengar.', 'No words were heard.'), 'assertive')
      return
    }
    await this.hear(heard.text, answering, 'voice')
  }

  /**
   * One sentence, from the microphone or the keyboard, while nothing or a
   * proposal is on screen.
   */
  private async hear(text: string, answering: boolean, via: Via): Promise<void> {
    this.turn += 1
    const turn = this.turn
    const standing = this.state.draft
    const question = answering ? standing.ambiguities[0] : undefined
    let pending: Pending | undefined

    if (question) {
      // A number or an option's words picks it; "no" cancels; anything else is
      // an explanation that goes back to the model with the question.
      const picked = pickChoice(text, question.choices)
      if (picked) return this.choose(question.id, picked, via)
      if (readAnswer(text) === 'no') return this.discard()
      pending = { question: question.question, transcript: standing.transcript }
    } else if (answering) {
      const answer = readAnswer(text)
      if (answer === 'yes') {
        this.editDraft({ ...standing, transcript: text })
        this.deps.announce(tr('Diterapkan.', 'Applied.'), 'assertive')
        return this.apply()
      }
      if (answer === 'no') return this.discard()
      // Neither yes nor no: a new instruction replaces the proposal.
    }

    const shown = pending ? `${pending.transcript} → ${text}` : text
    this.editDraft({ ...emptyDraft(), status: 'thinking', transcript: shown })

    const next = await this.deps.understand(text, pending)
    // A newer request started while this one was thinking. Its answer wins.
    if (turn !== this.turn) return
    this.present({ ...next, transcript: shown, via })
  }

  // --- canned lines, for a room with no microphone --------------------------------

  private playCannedLine(): void {
    const line = this.answering ? CONFIRM_UTTERANCE : this.deps.nextCannedUtterance()
    this.cannedLine = line
    const words = line.transcript.split(' ')
    let shown = 0
    const tick = () => {
      shown += 1
      this.editDraft({ ...this.state.draft, transcript: words.slice(0, shown).join(' ') })
      if (shown < words.length) this.cancelTimer = this.deps.after(130, tick)
    }
    this.cancelTimer = this.deps.after(200, tick)
  }

  private finishCannedLine(answering: boolean): void {
    const line = this.cannedLine
    this.cannedLine = null
    if (!line) return

    if (answering) {
      this.editDraft({ ...this.state.draft, transcript: CONFIRM_UTTERANCE.transcript })
      this.deps.announce(tr('Diterapkan, dari suara.', 'Applied, by voice.'), 'assertive')
      this.apply()
      return
    }

    const turn = this.turn
    this.editDraft({ ...this.state.draft, status: 'thinking', transcript: line.transcript })
    void this.deps.understand(line).then((next) => {
      if (turn === this.turn) this.present(next)
    })
  }

  // --- showing and applying a proposal ----------------------------------------------

  private present(next: Draft): void {
    this.editDraft(next)
    this.deps.earcon('draftReady')

    if (next.operations.length > 0) {
      // The routing is said out loud, not only drawn: a proposal you cannot hear
      // the reason for is a proposal you can only accept on faith.
      const why = next.intent === 'alat-diusulkan' ? ` ${next.reason}` : ''
      const count = next.operations.length
      this.deps.announce(
        tr(`Draf siap. ${count} usulan menunggu persetujuan.${why}`, `Draft ready. ${count} proposals waiting for approval.${why}`),
        'assertive',
      )
      return
    }

    const question = next.ambiguities[0]
    if (question) {
      // Options are read with their numbers, so they can be answered without
      // seeing where the buttons are.
      const options = question.choices.map((c, i) => `${i + 1}, ${c.label}.`).join(' ')
      this.deps.announce(
        question.choices.length > 0
          ? tr(`${question.question} ${options} Sebut nomornya, atau jelaskan.`, `${question.question} ${options} Say the number, or explain.`)
          : tr(`${question.question} Jelaskan dengan suara atau ketik.`, `${question.question} Explain by voice or typing.`),
        'assertive',
      )
      return
    }

    this.deps.announce(
      tr('Ucapan tidak dikenali. Teksnya bisa disunting sebelum diterapkan.', 'Not recognised as a command. The text can be edited before applying.'),
      'assertive',
    )
  }

  /** Applying is a performance, not a dump: one step, one sentence, one sound (D23). */
  private performNextStep(): void {
    const performing = this.state.performing
    if (!performing) return
    const { index, ops } = performing

    if (index >= ops.length) {
      this.update({ performing: null, draft: { ...this.state.draft, status: 'applied' } })
      return
    }

    this.cancelTimer = this.deps.after(index === 0 ? 280 : 520, () => {
      const op = ops[index]
      const via = this.state.draft.via ?? 'voice'
      if (op.extraCommands && op.extraCommands.length > 0) {
        // A template is several commands but one decision: one gesture, one undo (D44).
        const result = this.deps.runBatch([op.command, ...op.extraCommands], via)
        if (result.ok) {
          this.deps.announce(tr(`${op.preview} Diterapkan.`, `${op.preview} Applied.`))
          this.deps.earcon('createNode')
        } else {
          this.deps.reportError(result.message)
          this.deps.announce(result.message, 'assertive')
          this.deps.earcon('blocked')
        }
      } else {
        this.deps.runCommand(op.command, via)
      }
      this.update({ performing: { index: index + 1, ops } })
      this.performNextStep()
    })
  }

  // --- plumbing ---------------------------------------------------------------------

  private update(patch: Partial<VoiceState>): void {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((listener) => listener())
  }

  private clearTimer(): void {
    this.cancelTimer?.()
    this.cancelTimer = null
  }
}
