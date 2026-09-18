/**
 * The assistant as this person meets it: which model answers, how speech is
 * recognised, and the voice flow from talking to a proposal to applying it.
 *
 * The flow itself is plain TypeScript (services/voice/flow.ts). This provider
 * gives it its dependencies and lets React subscribe to it.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { useAnnouncer } from '../../a11y/Announcer'
import { audioBus } from '../../audio/bus'
import { probeOllama } from '../../core/agent/ollama'
import { readProvider, writeProvider, type ProviderId } from '../../core/agent/provider'
import type { Command } from '../../core/commands/types'
import { tr } from '../../core/i18n'
import type { InputPath, NodeId } from '../../core/model/types'
import { projectTree } from '../../core/tree/project'
import { VoiceFlow } from '../../services/voice/flow'
import { AGENT_UTTERANCES, buildDraft, UTTERANCES as STRUCTURE_UTTERANCES } from '../../services/voice/pipeline'
import {
  ASR_MODES,
  readAsrMode,
  readSpeechLang,
  recogniser,
  writeAsrMode,
  writeSpeechLang,
  type AsrMode,
  type AsrStatus,
  type SpeechLang,
} from '../../services/voice/speech'
import type { Draft } from '../../services/voice/types'
import { useDocument } from './DocumentProvider'
import { usePresence } from './PresenceProvider'
import { useView } from './ViewProvider'

/*
  The canned lines, interleaved so a demo meets both halves early: sentences the
  structure stage handles, and sentences that only the orchestrator can route.
*/
const UTTERANCES = STRUCTURE_UTTERANCES.flatMap((line, i) =>
  AGENT_UTTERANCES[i] ? [line, AGENT_UTTERANCES[i]] : [line],
)

export interface AssistantApi {
  /** Who answers a voice turn. Shown, never silently swapped (section 8). */
  provider: ProviderId
  setProvider: (id: ProviderId) => void
  providerState: { ready: boolean; detail: string }
  /** Re-runs the check after the address or model name is changed. */
  recheckProvider: () => void

  /** Who turns sound into words: Whisper on this device, or canned lines. */
  asrMode: AsrMode
  setAsrMode: (mode: AsrMode) => void
  asrStatus: AsrStatus
  speechLang: SpeechLang
  setSpeechLang: (value: SpeechLang) => void

  draft: Draft
  setDraft: (draft: Draft) => void
  talking: boolean
  /** True when the microphone is latched on after a tap rather than a hold. */
  talkLatched: boolean
  /**
   * Mode Menyimak: the microphone stays open and the voice detector decides
   * where sentences begin, so speaking needs no hand at all (D4). Off unless
   * somebody switches it on, and visible everywhere while it runs.
   */
  watching: boolean
  startWatching: () => void
  stopWatching: () => void
  /** The last sentence heard that was not addressed to Karsa. Shown, never acted on. */
  overheard: string | null
  startTalking: () => void
  stopTalking: () => void
  /** Release of the talk switch. Short press latches, long press ends. */
  endTalkHold: () => void
  /** A typed sentence, through exactly the same understanding as a spoken one. */
  submitText: (text: string) => void
  /** Picks an option of a standing question. Picking is the confirmation. */
  chooseOption: (ambiguityId: string, choiceId: string) => void
  applyDraft: () => void
  discardDraft: () => void

  /** Seconds spent listening or thinking. Shown, not hidden behind a spinner. */
  thinkingSeconds: number
  /** Nodes a pending draft would touch, so the canvas can mark them. */
  draftTargets: ReadonlySet<NodeId>
  /** Where the agent is standing right now. Drives the cursor on the canvas. */
  agentTargetId: NodeId | null
  /** A whole board about to land, which has no node to stand on yet. */
  draftLanding: Landing | null
  /** Set while accepted operations are landing one at a time. */
  agentAction: string | null
}

export interface Landing {
  id: NodeId
  /** The node it will hang from, or null when it lands as its own root. */
  parentId: NodeId | null
  title: string
  label: string
  /** How many nodes it brings, so the ghost can say so without guessing. */
  count: number
}

const AssistantContext = createContext<AssistantApi | null>(null)

export function AssistantProvider({ children }: { children: ReactNode }) {
  const { store, self, run, reportError } = useDocument()
  const { updateSelf } = usePresence()
  const { focusId } = useView()
  const announcer = useAnnouncer()

  /*
    Which engine answers. Read once, changed only by a person, and probed so the
    interface can say what is actually there rather than what is configured --
    "Ollama selected" and "Ollama running" are different facts.
  */
  const [provider, setProviderState] = useState<ProviderId>(readProvider)
  const [providerState, setProbe] = useState({ ready: false, detail: 'Belum diperiksa.' })
  const providerRef = useRef(provider)
  providerRef.current = provider

  const recheckProvider = useCallback(() => {
    if (providerRef.current !== 'ollama') {
      setProbe({ ready: true, detail: tr('Pencocokan aturan, tanpa model.', 'Rule matching, no model.') })
      return
    }
    setProbe({ ready: false, detail: tr('Memeriksa Ollama...', 'Checking Ollama...') })
    void probeOllama().then(setProbe)
  }, [])

  // Re-checked on demand too: the address can be changed from Settings without
  // a rebuild, and a check that only runs at startup would report the old one.
  useEffect(() => {
    recheckProvider()
  }, [provider, recheckProvider])

  const setProvider = useCallback((id: ProviderId) => {
    writeProvider(id)
    setProviderState(id)
  }, [])

  const [asrMode, setAsrModeState] = useState<AsrMode>(readAsrMode)
  const [asrStatus, setAsrStatus] = useState<AsrStatus>(() => recogniser.getStatus())
  const [speechLang, setSpeechLangState] = useState<SpeechLang>(readSpeechLang)
  useEffect(() => recogniser.subscribe(setAsrStatus), [])

  const setAsrMode = useCallback((mode: AsrMode) => {
    writeAsrMode(mode)
    setAsrModeState(mode)
    const model = ASR_MODES.find((m) => m.id === mode)?.model
    if (model) recogniser.load(model)
  }, [])
  const setSpeechLang = useCallback((value: SpeechLang) => {
    writeSpeechLang(value)
    setSpeechLangState(value)
  }, [])

  /*
    The flow lives outside React and outlives renders, so it reads the room's
    current values through this one ref, which every render refreshes. The
    announcer is read the same way: its object changes with every announcement,
    and a flow rebuilt on each one would forget the request it was in the middle
    of (D74).
  */
  const latest = useRef({
    run: (_command: Command, _via: InputPath): void => {},
    focusId,
    provider,
    asrMode,
    announcer,
    updateSelf,
    reportError,
  })
  latest.current = { run, focusId, provider, asrMode, announcer, updateSelf, reportError }

  const flow = useMemo(() => {
    let cannedIndex = 0
    return new VoiceFlow({
      recogniser: {
        get listening() {
          return recogniser.listening
        },
        isReady: () => recogniser.getStatus().phase === 'ready',
        load: (model) => recogniser.load(model),
        start: (onPartial) => recogniser.start(onPartial),
        stop: () => recogniser.stop(),
        cancel: () => recogniser.cancel(),
        watch: (handlers) => recogniser.watch(handlers),
        unwatch: () => recogniser.unwatch(),
      },
      asrModel: () => ASR_MODES.find((m) => m.id === latest.current.asrMode)?.model,
      nextCannedUtterance: () => UTTERANCES[cannedIndex++ % UTTERANCES.length],
      understand: (input, pending, declined) => {
        const current = store.getDoc()
        const { focusId: focus, provider: engine } = latest.current
        return buildDraft(input, current, projectTree(current), focus, engine, pending, declined)
      },
      runCommand: (command, via) => latest.current.run(command, via),
      runBatch: (commands, via) => {
        const result = store.dispatchBatch(commands, { actorId: self.id, inputPath: via })
        return result.ok ? { ok: true } : { ok: false, message: result.violation.message }
      },
      announce: (text, politeness) => latest.current.announcer.announce(text, politeness),
      earcon: (name) =>
        audioBus.emit(
          name === 'createNode'
            ? { earcon: 'createNode', depth: 0, hue: store.getDoc().actors[self.id]?.hue ?? 0 }
            : { earcon: name, force: true },
        ),
      setSpeaking: (active) => {
        latest.current.updateSelf({ talking: active })
        latest.current.announcer.setSpeechActive(active)
      },
      reportError: (message) => latest.current.reportError(message),
      now: () => Date.now(),
      after: (ms, fn) => {
        const timer = window.setTimeout(fn, ms)
        return () => window.clearTimeout(timer)
      },
    })
  }, [store, self.id])

  // Leaving the room mid-sentence must close the microphone (D4). That now
  // includes Mode Menyimak, where nobody is holding anything to let go of.
  useEffect(() => () => flow.dispose(), [flow])

  const { draft, talking, latched, performing, watching, overheard } = useSyncExternalStore(
    flow.subscribe,
    flow.getState,
    flow.getState,
  )

  // An honest clock instead of a spinner: a number that keeps moving reads as
  // working; a spinner that never resolves reads as broken.
  const [thinkingSeconds, setThinkingSeconds] = useState(0)
  useEffect(() => {
    setThinkingSeconds(0)
    if (draft.status !== 'listening' && draft.status !== 'thinking') return
    const timer = window.setInterval(() => setThinkingSeconds((s) => s + 1), 1000)
    return () => window.clearInterval(timer)
  }, [draft.status])

  /**
   * Which nodes a pending draft would touch. The canvas marks them while the
   * draft waits, so the person can see where the change would land before
   * deciding -- the waiting happens on the object, not only in a side panel.
   */
  const draftTargets = useMemo(() => {
    const ids = new Set<NodeId>()
    if (draft.status !== 'ready') return ids
    for (const op of draft.operations) {
      if (!op.accepted) continue
      const c = op.command as Record<string, unknown>
      for (const key of ['id', 'parentId', 'fromId', 'toId', 'targetId']) {
        const value = c[key]
        if (typeof value === 'string') ids.add(value)
      }
    }
    for (const amb of draft.ambiguities) {
      for (const choice of amb.choices) if (choice.targetId) ids.add(choice.targetId)
    }
    return ids
  }, [draft])

  /**
   * Where a whole board is about to land, when that is what was proposed.
   *
   * A template arrives as nodes that do not exist yet, so the agent had nothing
   * to stand on and D18 -- the thing about to change is marked where it will
   * land -- was empty for the largest change the assistant can propose. The ids
   * are minted when the plan is built, not when it is applied, so the root
   * already has one and the canvas can draw it as a card that is clearly not
   * there yet.
   *
   * Shown for every template, not only a parentless one. Standing on the
   * parent would mark the one node that is *not* changing while saying nothing
   * about the twelve that are, and "Siapkan papan retro: 12 simpul" is a
   * sentence, not a place.
   */
  const draftLanding = useMemo<Landing | null>(() => {
    const op =
      performing && performing.index < performing.ops.length
        ? performing.ops[performing.index]
        : draft.status === 'ready'
          ? draft.operations.find((step) => step.accepted && step.source)
          : undefined
    if (!op?.source) return null
    const root = op.command
    if (root.type !== 'createNode' || !root.id) return null
    return {
      id: root.id,
      parentId: root.parentId,
      title: root.title,
      label: op.source.label,
      count: 1 + (op.extraCommands?.length ?? 0),
    }
  }, [performing, draft])

  const agentTargetId = useMemo<NodeId | null>(() => {
    if (performing && performing.index < performing.ops.length) {
      return draftLanding?.id ?? commandTarget(performing.ops[performing.index].command) ?? focusId
    }
    if (draft.status === 'ready') {
      const first = draft.operations.find((op) => op.accepted)
      if (first) return draftLanding?.id ?? commandTarget(first.command) ?? focusId
      const amb = draft.ambiguities[0]
      if (amb) return amb.choices[0]?.targetId ?? focusId
    }
    return focusId
  }, [performing, draft, focusId, draftLanding])

  const agentAction =
    performing && performing.index < performing.ops.length ? performing.ops[performing.index].preview : null

  const api: AssistantApi = {
    provider,
    setProvider,
    providerState,
    recheckProvider,
    asrMode,
    setAsrMode,
    asrStatus,
    speechLang,
    setSpeechLang,
    draft,
    setDraft: flow.editDraft,
    talking,
    talkLatched: latched,
    watching,
    startWatching: flow.startWatching,
    stopWatching: flow.stopWatching,
    overheard,
    startTalking: flow.press,
    stopTalking: flow.stop,
    endTalkHold: flow.release,
    submitText: flow.submitText,
    chooseOption: flow.choose,
    applyDraft: flow.apply,
    discardDraft: flow.discard,
    thinkingSeconds,
    draftTargets,
    agentTargetId,
    draftLanding,
    agentAction,
  }

  return <AssistantContext.Provider value={api}>{children}</AssistantContext.Provider>
}

export function useAssistant(): AssistantApi {
  const ctx = useContext(AssistantContext)
  if (!ctx) throw new Error('useAssistant must be used inside RoomProvider')
  return ctx
}

/** The node an operation is anchored to, for placing the cursor. */
function commandTarget(command: Command): NodeId | null {
  switch (command.type) {
    case 'createNode':
      return command.parentId
    case 'moveNode':
      return command.parentId ?? command.id
    case 'addRelation':
      return command.toId
    case 'addComment':
      return command.targetType === 'node' ? command.targetId : null
    case 'renameNode':
    case 'setNodeKind':
    case 'setNodeState':
    case 'setNodeNote':
    case 'reorderNode':
    case 'deleteNode':
      return command.id
    default:
      return null
  }
}
