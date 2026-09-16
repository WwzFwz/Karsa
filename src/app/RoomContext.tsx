/**
 * The hub. Views read from here and nowhere else.
 *
 * Two things are deliberately kept apart:
 *   - document state, which is shared and changes only through commands
 *   - view state (focus, collapse, mode, sound), which is navigation and stays
 *     on this device
 *
 * The dividing line: if an action changes what someone else's screen reader
 * would read out, it changes data. Otherwise it is navigation.
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
import { useAnnouncer } from '../a11y/Announcer'
import { audioBus } from '../audio/bus'
import type { SoundProfile } from '../audio/earcons'
import { narrate } from '../core/events/narrate'
import type { Command, CommandResult } from '../core/commands/types'
import type { InputPath, NodeId, RoomDoc, RoomShape } from '../core/model/types'
import type { Point } from '../core/shape/layout'
import { countVotes, hasVoted } from '../core/tools/tally'
import { templateById } from '../core/templates/registry'
import { probeOllama } from '../core/agent/ollama'
import { readProvider, writeProvider, type ProviderId } from '../core/agent/provider'
import { expandTemplate, templateSize } from '../core/templates/expand'
import { projectTree, visibleOrder, type TreeProjection } from '../core/tree/project'
import { suggestShape, type ShapeSuggestion } from '../core/shape/suggest'
import { MemoryDocStore } from '../store/MemoryDocStore'
import { useParams } from 'react-router-dom'
import {
  buildEmptyDoc,
  buildSeedDoc,
  buildSeedParticipants,
  buildSoloParticipants,
  SELF_ID,
} from '../store/seed/room'
import { findRoom } from '../features/rooms/rooms'
import { tr } from '../core/i18n'
import { useLang } from '../ui/useLang'
import {
  AGENT_UTTERANCES,
  buildDraft,
  UTTERANCES as STRUCTURE_UTTERANCES,
} from '../features/voice/mockPipeline'
import { VoiceFlow } from '../features/voice/flow'
import {
  ASR_MODES,
  readSpeechLang,
  writeSpeechLang,
  readAsrMode,
  recogniser,
  writeAsrMode,
  type AsrMode,
  type AsrStatus,
  type SpeechLang,
} from '../features/voice/speech'

/*
  The canned lines, interleaved so a demo meets both halves early: sentences the
  structure stage handles, and sentences that only the orchestrator can route.
*/
const UTTERANCES = STRUCTURE_UTTERANCES.flatMap((line, i) =>
  AGENT_UTTERANCES[i] ? [line, AGENT_UTTERANCES[i]] : [line],
)
import type { Draft } from '../features/voice/types'

export type ViewMode = 'canvas' | 'outline'
export type SessionMode = 'meeting' | 'review'

interface RoomApi {
  doc: RoomDoc
  tree: TreeProjection
  suggestion: ShapeSuggestion
  participants: ReturnType<MemoryDocStore['getPresence']>['participants']
  selfId: string
  nameOf: (actorId: string) => string
  hueOf: (actorId: string) => number

  focusId: NodeId | null
  /** The node whose title is being typed over, in place. Navigation state. */
  editingId: NodeId | null
  setEditingId: (id: NodeId | null) => void
  /**
   * Hand-placed positions for the current shape.
   *
   * Device-local, never in the document and never on the wire, so rule 2 holds
   * exactly as written: no meaning is *stored* in a coordinate. Kept per shape,
   * because a mind map and a flow chart disagree about where things belong and
   * neither should inherit the other's nudges. D5 already accepted that two
   * devices may lay the same room out differently.
   */
  nodeOverrides: Readonly<Record<string, Point>>
  /** `null` forgets the placement, returning the node to auto layout. */
  setNodeOverride: (id: NodeId, at: Point | null) => void
  clearOverrides: () => void
  /** Set while a relation is being drawn: the next node picked is the target. */
  linkingFrom: NodeId | null
  startLinking: (id: NodeId) => void
  cancelLinking: () => void
  setFocus: (id: NodeId | null, options?: { announce?: boolean }) => void
  collapsed: ReadonlySet<NodeId>
  toggleCollapse: (id: NodeId, next?: boolean) => void
  visibleIds: NodeId[]
  /**
   * What the canvas draws. A tool's children are folded into its card, so the
   * canvas hides them while the outline keeps showing them -- the outline is
   * where the detail lives, and a tool must never make content unreachable.
   */
  canvasIds: NodeId[]
  /** True while the actor's standing vote on this node is a yes. */
  votedByMe: (id: NodeId) => boolean
  votesOn: (id: NodeId) => number
  /** Drops a whole template under a parent, as one undo step and one sentence. */
  insertTemplate: (templateId: string, parentId: NodeId | null) => void

  /** Who answers a voice turn. Shown, never silently swapped (section 8). */
  provider: ProviderId
  setProvider: (id: ProviderId) => void
  providerState: { ready: boolean; detail: string }
  /** Re-runs the check after the address or model name is changed. */
  recheckProvider: () => void

  /** Who turns sound into words. Whisper on this device, or canned lines for a demo. */
  asrMode: AsrMode
  setAsrMode: (mode: AsrMode) => void
  asrStatus: AsrStatus
  /** Which language the recogniser listens for. Shared by the dock and settings. */
  speechLang: SpeechLang
  setSpeechLang: (value: SpeechLang) => void
  /** A typed sentence, through exactly the same understanding as a spoken one. */
  submitText: (text: string) => void
  /** Picks an option of a standing question. Picking is the confirmation. */
  chooseOption: (ambiguityId: string, choiceId: string) => void

  view: ViewMode
  setView: (view: ViewMode) => void
  /** Side panel visibility. Navigation: it folds my screen, not yours. */
  panelHidden: boolean
  togglePanel: () => void
  /** Left navigation visibility, the hamburger. */
  sidebarHidden: boolean
  toggleSidebar: () => void
  /** Canvas at full height, chrome out of the way. */
  focusMode: boolean
  toggleFocusMode: (next?: boolean) => void
  mode: SessionMode
  setMode: (mode: SessionMode) => void
  soundProfile: SoundProfile
  setSoundProfile: (profile: SoundProfile) => void

  run: (command: Command, inputPath?: InputPath) => CommandResult
  undo: () => void
  canUndo: boolean
  lastError: string | null
  clearError: () => void

  draft: Draft
  /** Seconds the agent has been thinking. Shown, not hidden behind a spinner. */
  thinkingSeconds: number
  /** True when the microphone is latched on after a tap rather than a hold. */
  talkLatched: boolean
  /** Release of the talk switch. Short press latches, long press ends. */
  endTalkHold: () => void
  /** Nodes a pending draft would touch, so the canvas can mark them. */
  draftTargets: ReadonlySet<NodeId>
  /** Where the agent is standing right now. Drives the cursor on the canvas. */
  agentTargetId: NodeId | null
  /** Set while accepted operations are landing one at a time. */
  agentAction: string | null
  /** True while a canvas is on screen, so the dock does not repeat its bubble. */
  canvasMounted: boolean
  setCanvasMounted: (mounted: boolean) => void
  talking: boolean
  startTalking: () => void
  stopTalking: () => void
  setDraft: (draft: Draft) => void
  applyDraft: () => void
  discardDraft: () => void

  traversing: boolean
  toggleTraversal: () => void
  traversalIndex: number

  pointAt: (id: NodeId | null) => void
  simulateConflict: () => void
}

const EMPTY_OVERRIDES: Readonly<Record<string, Point>> = Object.freeze({})

const RoomContext = createContext<RoomApi | null>(null)

/** The one room that carries the demo content. Everything else starts empty. */
const DEMO_ROOM = 'KUR-482'

export function RoomProvider({ selfName, children }: { selfName: string; children: ReactNode }) {
  const announcer = useAnnouncer()
  const { roomId } = useParams()

  /*
    A room you just made must not open somebody else's meeting. Only the demo
    code carries the seeded twenty nodes; any other room starts with its own
    name on a single root and nobody in it but you.
  */
  const store = useMemo(() => {
    const id = roomId ?? DEMO_ROOM
    if (id === DEMO_ROOM) {
      return new MemoryDocStore(buildSeedDoc(), SELF_ID, buildSeedParticipants(selfName))
    }
    const summary = findRoom(id)
    return new MemoryDocStore(
      buildEmptyDoc(id, summary?.title ?? 'Ruang tanpa nama'),
      SELF_ID,
      buildSoloParticipants(selfName),
    )
  }, [selfName, roomId])

  const doc = useSyncExternalStore(store.subscribeDoc, store.getDoc, store.getDoc)
  const presence = useSyncExternalStore(store.subscribePresence, store.getPresence, store.getPresence)

  const tree = useMemo(() => projectTree(doc), [doc])
  const suggestion = useMemo(() => suggestShape(doc, tree), [doc, tree])

  const [collapsed, setCollapsed] = useState<Set<NodeId>>(() => new Set())
  const [focusId, setFocusId] = useState<NodeId | null>('n_akar')
  const [editingId, setEditingId] = useState<NodeId | null>(null)
  const [linkingFrom, setLinkingFrom] = useState<NodeId | null>(null)
  const [overridesByShape, setOverridesByShape] = useState<
    Partial<Record<RoomShape, Record<string, Point>>>
  >({})
  const [view, setView] = useState<ViewMode>('canvas')
  const [panelHidden, setPanelHidden] = useState(false)
  const [sidebarHidden, setSidebarHidden] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [mode, setModeState] = useState<SessionMode>('meeting')
  const [soundProfile, setSoundProfileState] = useState<SoundProfile>('sparse')
  const [lastError, setLastError] = useState<string | null>(null)

  /*
    Which engine answers. Read once, changed only by a person, and probed so the
    interface can say what is actually there rather than what is configured --
    "Ollama selected" and "Ollama running" are different facts.
  */
  // Re-render everything that speaks when the output language changes.
  const language = useLang()
  const [provider, setProviderState] = useState<ProviderId>(readProvider)
  const [providerState, setProbe] = useState({ ready: false, detail: 'Belum diperiksa.' })
  const providerRef = useRef<ProviderId>(provider)
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
  const setSpeechLang = useCallback((value: SpeechLang) => {
    writeSpeechLang(value)
    setSpeechLangState(value)
  }, [])
  useEffect(() => recogniser.subscribe(setAsrStatus), [])
  const setAsrMode = useCallback((mode: AsrMode) => {
    writeAsrMode(mode)
    setAsrModeState(mode)
    const model = ASR_MODES.find((m) => m.id === mode)?.model
    if (model) recogniser.load(model)
  }, [])
  const [traversing, setTraversing] = useState(false)
  const [traversalIndex, setTraversalIndex] = useState(0)
  const [thinkingSeconds, setThinkingSeconds] = useState(0)

  /*
    The voice flow of this person (features/voice/flow.ts). It lives outside
    React and outlives renders, so it reads the room's current values through
    this one ref, which every render refreshes. The announcer is read the same
    way: its object changes with every announcement, and a flow rebuilt on each
    one would forget the request it was in the middle of.
  */
  const latest = useRef({
    run: (_command: Command, _via: InputPath): void => {},
    focusId,
    provider,
    asrMode,
    announcer,
  })

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
      },
      asrModel: () => ASR_MODES.find((m) => m.id === latest.current.asrMode)?.model,
      nextCannedUtterance: () => UTTERANCES[cannedIndex++ % UTTERANCES.length],
      understand: (input, pending) => {
        const current = store.getDoc()
        return buildDraft(input, current, projectTree(current), latest.current.focusId, latest.current.provider, pending)
      },
      runCommand: (command, via) => latest.current.run(command, via),
      runBatch: (commands, via) => {
        const result = store.dispatchBatch(commands, { actorId: SELF_ID, inputPath: via })
        return result.ok ? { ok: true } : { ok: false, message: result.violation.message }
      },
      announce: (text, politeness) => latest.current.announcer.announce(text, politeness),
      earcon: (name) =>
        audioBus.emit(
          name === 'createNode'
            ? { earcon: 'createNode', depth: 0, hue: store.getDoc().actors[SELF_ID]?.hue ?? 0 }
            : { earcon: name, force: true },
        ),
      setSpeaking: (active) => {
        store.updateSelf({ talking: active })
        latest.current.announcer.setSpeechActive(active)
      },
      reportError: (message) => setLastError(message),
      now: () => Date.now(),
      after: (ms, fn) => {
        const timer = window.setTimeout(fn, ms)
        return () => window.clearTimeout(timer)
      },
    })
  }, [store])

  // Leaving the room mid-sentence must close the microphone (D4).
  useEffect(() => () => flow.dispose(), [flow])

  const voice = useSyncExternalStore(flow.subscribe, flow.getState, flow.getState)
  const { draft, talking, latched: talkLatched, performing } = voice
  const [canvasMounted, setCanvasMounted] = useState(false)

  const visibleIds = useMemo(() => visibleOrder(tree, collapsed), [tree, collapsed])

  /*
    Undo can take away the node the focus was sitting on, and a focus pointing
    at something gone is worse than no focus: `n` would try to create under a
    ghost parent, and the rail would offer to add "di bawah" nothing.
  */
  useEffect(() => {
    if (focusId && !doc.nodes[focusId]) setFocusId(tree.rootIds[0] ?? null)
  }, [doc.nodes, focusId, tree.rootIds])

  const canvasIds = useMemo(() => {
    const folded = new Set(collapsed)
    for (const node of Object.values(doc.nodes)) if (node.tool) folded.add(node.id)
    return visibleOrder(tree, folded)
  }, [tree, collapsed, doc.nodes])

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

  // An honest clock instead of a spinner. On-device speech recognition takes
  // seconds, and a number that keeps moving reads as working; a spinner that
  // never resolves reads as broken.
  useEffect(() => {
    if (draft.status !== 'listening' && draft.status !== 'thinking') {
      setThinkingSeconds(0)
      return
    }
    setThinkingSeconds(0)
    const timer = window.setInterval(() => setThinkingSeconds((s) => s + 1), 1000)
    return () => window.clearInterval(timer)
  }, [draft.status])

  const nameOf = useCallback(
    (actorId: string) => {
      // "Anda" is a pronoun, not a name, so it is the one name that is translated.
      const name = doc.actors[actorId]?.displayName
      if (!name) return tr('Seseorang', 'Someone')
      return actorId === SELF_ID ? tr(name, 'You') : name
    },
    [doc.actors, language],
  )
  const hueOf = useCallback((actorId: string) => doc.actors[actorId]?.hue ?? 0, [doc.actors])

  useEffect(() => {
    audioBus.setProfile(soundProfile)
  }, [soundProfile])

  // Announce and sound merge repairs. A cut is designed behaviour, not damage,
  // so it gets a name and a deliberately dissonant earcon rather than silence.
  const knownRepairs = useRef(new Set<string>())
  useEffect(() => {
    for (const repair of tree.repairs) {
      const key = `${repair.nodeId}:${repair.formerParentId}`
      if (knownRepairs.current.has(key)) continue
      knownRepairs.current.add(key)
      const title = doc.nodes[repair.nodeId]?.title ?? 'Sebuah simpul'
      announcer.announce(
        repair.reason === 'cycle'
          ? `Perpindahan bertabrakan. ${title} dikembalikan ke akar.`
          : `Induk ${title} hilang. Simpul dikembalikan ke akar.`,
        'assertive',
      )
      audioBus.emit({ earcon: 'cycleResolved', force: true })
    }
  }, [tree.repairs, doc.nodes, announcer])

  const setFocus = useCallback(
    (id: NodeId | null, options: { announce?: boolean } = {}) => {
      setFocusId(id)
      store.updateSelf({ focusNodeId: id })
      if (id && options.announce !== false) {
        audioBus.emit({ earcon: 'focus', depth: tree.byId.get(id)?.depth ?? 0 })
      }
    },
    [store, tree],
  )

  /*
    Drawing a relation as two picks instead of a drag.

    Pick the handle, pick the target. It needs no sustained pressure and no
    precise path, so it works for someone who cannot drag -- and the same two
    steps already exist on the keyboard as `r` plus the target picker, which is
    why this is an addition rather than a second way of thinking about it.
  */
  const startLinking = useCallback(
    (id: NodeId) => {
      setLinkingFrom(id)
      announcer.announce('Pilih simpul tujuan untuk dihubungkan. Escape untuk membatalkan.', 'assertive')
    },
    [announcer],
  )

  const cancelLinking = useCallback(() => {
    setLinkingFrom((current) => {
      if (current) announcer.announce('Penghubungan dibatalkan.')
      return null
    })
  }, [announcer])

  const run = useCallback(
    (command: Command, inputPath: InputPath = 'keyboard'): CommandResult => {
      const result = store.dispatch(command, { actorId: SELF_ID, inputPath })
      if (!result.ok) {
        setLastError(result.violation.message)
        announcer.announce(result.violation.message, 'assertive')
        audioBus.emit({ earcon: 'blocked', force: true })
        return result
      }
      setLastError(null)
      for (const event of result.events) {
        announcer.announce(narrate(event, nameOf(event.actorId)))
        audioBus.emit({
          earcon: event.type,
          depth: event.payload.nodeId ? tree.byId.get(event.payload.nodeId)?.depth ?? 0 : 0,
          hue: hueOf(event.actorId),
        })
      }
      /*
        A hand placement is an opinion about where a node sits under the layout
        it was placed in. Giving the node a new parent invalidates that opinion
        the same way changing the room's shape does (D31), so the override is
        dropped and auto layout puts the node beside its new siblings.
      */
      for (const event of result.events) {
        if (event.type !== 'moveNode' || !event.payload.nodeId) continue
        const moved = event.payload.nodeId as NodeId
        setOverridesByShape((prev) => {
          const sheet = prev[doc.room.shape]
          if (!sheet || !(moved in sheet)) return prev
          const next = { ...sheet }
          delete next[moved]
          return { ...prev, [doc.room.shape]: next }
        })
      }

      const created = result.events.find((e) => e.type === 'createNode')
      if (created?.payload.nodeId) setFocusId(created.payload.nodeId as NodeId)
      return result
    },
    [store, announcer, nameOf, hueOf, tree, doc.room.shape],
  )

  /*
    A template is many commands but one gesture, so it takes one snapshot and
    says one sentence. The individual events still go into the log -- rule 5 is
    about the record, and six things did happen -- but announcing six of them
    into a meeting is exactly the burst D7 exists to damp.
  */
  const insertTemplate = useCallback(
    (templateId: string, parentId: NodeId | null) => {
      const spec = templateById(templateId)
      if (!spec) return
      const built = spec.build()
      const commands = expandTemplate(built, parentId)
      const result = store.dispatchBatch(commands, { actorId: SELF_ID, inputPath: 'pointer' })
      if (!result.ok) {
        setLastError(result.violation.message)
        announcer.announce(result.violation.message, 'assertive')
        audioBus.emit({ earcon: 'blocked', force: true })
        return
      }
      announcer.announce(
        `Anda menambahkan templat ${spec.label}, ${templateSize(built)} simpul.`,
      )
      audioBus.emit({ earcon: 'createNode', depth: 0, hue: hueOf(SELF_ID) })
      const first = result.events.find((event) => event.payload.nodeId)
      if (first?.payload.nodeId) setFocusId(first.payload.nodeId as NodeId)
    },
    [store, announcer, hueOf],
  )

  /*
    Undo is what makes the new rule 8 workable. Reversing a change is itself a
    change, so it gets the same treatment as any other: a sentence, an earcon,
    and a line in the log.
  */
  const undo = useCallback(() => {
    const event = store.undo(SELF_ID)
    if (!event) {
      announcer.announce('Tidak ada perubahan yang bisa dibatalkan.', 'assertive')
      audioBus.emit({ earcon: 'blocked', force: true })
      return
    }
    announcer.announce(narrate(event, nameOf(event.actorId)), 'assertive')
    audioBus.emit({ earcon: 'undo', force: true })
  }, [store, announcer, nameOf])

  // --- voice ---------------------------------------------------------------

  latest.current = { run, focusId, provider, asrMode, announcer }

  const agentTargetId = useMemo<NodeId | null>(() => {
    if (performing && performing.index < performing.ops.length) {
      return commandTarget(performing.ops[performing.index].command)
    }
    if (draft.status === 'ready') {
      const first = draft.operations.find((op) => op.accepted)
      if (first) return commandTarget(first.command)
      const amb = draft.ambiguities[0]
      if (amb) return amb.choices[0]?.targetId ?? focusId
    }
    return focusId
  }, [performing, draft, focusId])

  const agentAction = useMemo<string | null>(() => {
    if (!performing || performing.index >= performing.ops.length) return null
    return performing.ops[performing.index].preview
  }, [performing])

  // --- audio traversal ----------------------------------------------------

  const toggleTraversal = useCallback(() => {
    setTraversing((on) => {
      const next = !on
      announcer.announce(next ? 'Telusur audio dimulai.' : 'Telusur audio berhenti.')
      return next
    })
  }, [announcer])

  useEffect(() => {
    if (!traversing) return
    const startAt = Math.max(0, visibleIds.indexOf(focusId ?? ''))
    setTraversalIndex(startAt)
    let index = startAt
    const timer = window.setInterval(() => {
      if (index >= visibleIds.length) {
        setTraversing(false)
        announcer.announce('Telusur audio selesai.')
        return
      }
      const id = visibleIds[index]
      const entry = tree.byId.get(id)
      if (entry) {
        audioBus.emit({ earcon: 'traverse', depth: entry.depth, force: true })
        announcer.announce(`Tingkat ${entry.depth + 1}. ${entry.node.title}.`)
        setFocusId(id)
      }
      setTraversalIndex(index)
      index += 1
    }, 1400)
    return () => window.clearInterval(timer)
  }, [traversing, visibleIds, tree, announcer, focusId])

  const toggleCollapse = useCallback((id: NodeId, next?: boolean) => {
    setCollapsed((prev) => {
      const copy = new Set(prev)
      const shouldCollapse = next ?? !copy.has(id)
      if (shouldCollapse) copy.add(id)
      else copy.delete(id)
      return copy
    })
  }, [])

  const setMode = useCallback(
    (nextMode: SessionMode) => {
      setModeState(nextMode)
      store.updateSelf({ mode: nextMode })
      setSoundProfileState(nextMode === 'review' ? 'full' : 'sparse')
      announcer.announce(nextMode === 'review' ? 'Mode telaah. Bunyi penuh.' : 'Mode rapat. Bunyi ditekan.')
    },
    [store, announcer],
  )

  const pointAt = useCallback(
    (id: NodeId | null) => {
      store.pointAt(id)
      if (id) announcer.announce(`Anda menunjuk ${doc.nodes[id]?.title ?? 'sebuah simpul'}.`)
    },
    [store, announcer, doc.nodes],
  )

  /**
   * Mock only. Forces the crossing-move situation that Yjs cannot prevent, so
   * the repair path can be seen and heard on demand instead of being described.
   */
  const simulateConflict = useCallback(() => {
    store.forceParent('n_riset', 'n_wawancara')
  }, [store])

  const api: RoomApi = {
    doc,
    tree,
    suggestion,
    participants: presence.participants,
    selfId: presence.selfId,
    nameOf,
    hueOf,
    focusId,
    editingId,
    setEditingId,
    nodeOverrides: overridesByShape[doc.room.shape] ?? EMPTY_OVERRIDES,
    setNodeOverride: (id, at) =>
      setOverridesByShape((prev) => {
        const sheet = { ...(prev[doc.room.shape] ?? {}) }
        if (at) sheet[id] = at
        else delete sheet[id]
        return { ...prev, [doc.room.shape]: sheet }
      }),
    clearOverrides: () =>
      setOverridesByShape((prev) => {
        const next = { ...prev }
        delete next[doc.room.shape]
        return next
      }),
    linkingFrom,
    startLinking,
    cancelLinking,
    setFocus,
    collapsed,
    toggleCollapse,
    visibleIds,
    canvasIds,
    votedByMe: (id: NodeId) => hasVoted(doc, id, SELF_ID),
    votesOn: (id: NodeId) => countVotes(doc, id),
    insertTemplate,
    provider,
    setProvider,
    providerState,
    recheckProvider,
    asrMode,
    setAsrMode,
    asrStatus,
    speechLang,
    setSpeechLang,
    submitText: flow.submitText,
    chooseOption: flow.choose,
    view,
    setView,
    panelHidden,
    togglePanel: () => setPanelHidden((v) => !v),
    sidebarHidden,
    toggleSidebar: () => setSidebarHidden((v) => !v),
    focusMode,
    toggleFocusMode: (next?: boolean) => setFocusMode((v) => next ?? !v),
    mode,
    setMode,
    soundProfile,
    setSoundProfile: setSoundProfileState,
    run,
    undo,
    // Re-read on every render; the store notifies on both dispatch and undo.
    canUndo: store.canUndo(),
    lastError,
    clearError: () => setLastError(null),
    draft,
    thinkingSeconds,
    talkLatched,
    endTalkHold: flow.release,
    draftTargets,
    agentTargetId,
    agentAction,
    canvasMounted,
    setCanvasMounted,
    talking,
    startTalking: flow.press,
    stopTalking: flow.stop,
    setDraft: flow.editDraft,
    applyDraft: flow.apply,
    discardDraft: flow.discard,
    traversing,
    toggleTraversal,
    traversalIndex,
    pointAt,
    simulateConflict,
  }

  return <RoomContext.Provider value={api}>{children}</RoomContext.Provider>
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

export function useRoom(): RoomApi {
  const ctx = useContext(RoomContext)
  if (!ctx) throw new Error('useRoom must be used inside RoomProvider')
  return ctx
}
