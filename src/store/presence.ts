/**
 * Who is in the room right now, through Yjs Awareness.
 *
 * Presence is not document: it is never logged, never undone, and it vanishes
 * when a device goes away. Each device publishes one small state -- who it is,
 * whether it is talking, which node it is on and pointing at -- and this module
 * turns every device's state into one list of people.
 *
 * Two rules from the design:
 *   - Sent at most about ten times a second (section 10). The person's own row
 *     updates immediately; only what goes on the wire is paced.
 *   - One person with two tabs is one person. States are grouped by actor id.
 *
 * Without a server the list is just this device, and nothing else changes.
 *
 * An Awareness belongs to one connection, not to the room: the server provider
 * destroys it on disconnect. So a connection attaches one here and detaches it
 * when it closes, and this device's own state survives in between.
 */

import type { Awareness } from 'y-protocols/awareness'
import type { Actor, ActorId, NodeId, Participant } from '../core/model/types'

export type Connection = 'connected' | 'connecting' | 'offline'

export interface PresenceSnapshot {
  selfId: ActorId
  participants: Participant[]
  connection: Connection
}

/** Something another person did that is worth a sound and a sentence. */
export type PresenceChange =
  | { type: 'joined'; person: Participant }
  | { type: 'left'; person: Participant }
  | { type: 'pointed'; person: Participant; nodeId: NodeId }

/** What one device publishes. Only symbols and ids -- never a coordinate (rule 2). */
interface PublishedState {
  actorId: ActorId
  displayName: string
  hue: number
  talking: boolean
  focusNodeId: NodeId | null
  pointingNodeId: NodeId | null
  mode: 'meeting' | 'review'
  /** When this device last changed its state, to pick the freshest of two tabs. */
  at: number
}

type SelfPatch = Partial<Pick<PublishedState, 'talking' | 'focusNodeId' | 'pointingNodeId' | 'mode'>>

export interface RoomPresenceOptions {
  /** Milliseconds between states sent to others. */
  sendEveryMs?: number
  /**
   * How long after connecting the people already in the room are taken as the
   * starting point rather than announced one by one as arrivals.
   */
  settleMs?: number
  now?: () => number
}

export class RoomPresence {
  private awareness: Awareness | null = null
  private readonly self: Actor
  private readonly sendEveryMs: number
  private readonly settleMs: number
  private readonly now: () => number

  private local: PublishedState
  private snapshot: PresenceSnapshot
  private connection: Connection = 'offline'
  private settledAt = 0
  private lastSent = 0
  private pending: number | null = null

  private listeners = new Set<() => void>()
  private changeListeners = new Set<(changes: PresenceChange[]) => void>()

  constructor(self: Actor, options: RoomPresenceOptions = {}) {
    this.self = self
    this.sendEveryMs = options.sendEveryMs ?? 100
    this.settleMs = options.settleMs ?? 1500
    this.now = options.now ?? Date.now
    this.local = {
      actorId: self.id,
      displayName: self.displayName,
      hue: self.hue,
      talking: false,
      focusNodeId: null,
      pointingNodeId: null,
      mode: 'meeting',
      at: this.now(),
    }
    this.snapshot = this.build()
  }

  /** Starts sharing through a connection's Awareness. Returns the detach. */
  attach = (awareness: Awareness): (() => void) => {
    this.awareness = awareness
    awareness.setLocalState(this.local)
    this.lastSent = this.now()
    awareness.on('change', this.onChange)
    return () => {
      awareness.off('change', this.onChange)
      if (this.awareness === awareness) this.awareness = null
      if (this.pending !== null) clearTimeout(this.pending)
      this.pending = null
      this.setConnection('offline')
    }
  }

  getSnapshot = (): PresenceSnapshot => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Arrivals, departures and pointing by other people. */
  subscribeChanges = (listener: (changes: PresenceChange[]) => void): (() => void) => {
    this.changeListeners.add(listener)
    return () => this.changeListeners.delete(listener)
  }

  /** This device's own state. Shown here at once; sent to others at a steady pace. */
  updateSelf = (patch: SelfPatch): void => {
    this.local = { ...this.local, ...patch, at: this.now() }
    this.publish()
    this.refresh([])
  }

  pointAt = (nodeId: NodeId | null): void => {
    this.updateSelf({ pointingNodeId: nodeId })
  }

  setConnection = (connection: Connection): void => {
    if (connection === this.connection) return
    if (connection === 'connected') this.settledAt = this.now() + this.settleMs
    this.connection = connection
    this.refresh([])
  }

  private publish(): void {
    const wait = this.lastSent + this.sendEveryMs - this.now()
    if (wait <= 0) {
      this.send()
      return
    }
    if (this.pending !== null) return
    this.pending = setTimeout(() => {
      this.pending = null
      this.send()
    }, wait) as unknown as number
  }

  private send(): void {
    this.lastSent = this.now()
    this.awareness?.setLocalState(this.local)
  }

  private onChange = (_change: unknown, origin: unknown): void => {
    // Our own sends are already on screen.
    if (origin === 'local') return
    const before = this.snapshot
    this.snapshot = this.build()
    const changes = this.now() < this.settledAt ? [] : diff(before, this.snapshot)
    this.refresh(changes, false)
  }

  private refresh(changes: PresenceChange[], rebuild = true): void {
    if (rebuild) this.snapshot = this.build()
    this.listeners.forEach((l) => l())
    if (changes.length > 0) this.changeListeners.forEach((l) => l(changes))
  }

  private build(): PresenceSnapshot {
    const byActor = new Map<ActorId, PublishedState[]>()
    const awareness = this.awareness
    for (const [clientId, state] of awareness?.getStates() ?? []) {
      // This device, and this person's other tabs, are already the first row.
      if (clientId === awareness?.clientID || !isPublished(state) || state.actorId === this.self.id) continue
      byActor.set(state.actorId, [...(byActor.get(state.actorId) ?? []), state])
    }
    const others = [...byActor.values()].map(merge).sort((a, b) => a.displayName.localeCompare(b.displayName))
    return {
      selfId: this.self.id,
      participants: [toParticipant(this.local), ...others],
      connection: this.connection,
    }
  }
}

/** Two tabs of one person: talking if either is, focus and pointing from the freshest. */
function merge(states: PublishedState[]): Participant {
  const freshest = states.reduce((a, b) => (b.at > a.at ? b : a))
  return toParticipant({ ...freshest, talking: states.some((s) => s.talking) })
}

function toParticipant(state: PublishedState): Participant {
  return {
    actorId: state.actorId,
    displayName: state.displayName,
    hue: state.hue,
    talking: state.talking,
    focusNodeId: state.focusNodeId,
    pointingNodeId: state.pointingNodeId,
    mode: state.mode,
    online: true,
    lastSeen: state.at,
  }
}

function isPublished(state: unknown): state is PublishedState {
  const s = state as Partial<PublishedState> | null
  return !!s && typeof s.actorId === 'string' && typeof s.displayName === 'string'
}

function diff(before: PresenceSnapshot, after: PresenceSnapshot): PresenceChange[] {
  const self = after.selfId
  const was = new Map(before.participants.map((p) => [p.actorId, p]))
  const now = new Map(after.participants.map((p) => [p.actorId, p]))
  const changes: PresenceChange[] = []
  for (const [id, person] of now) {
    if (id === self) continue
    const old = was.get(id)
    if (!old) changes.push({ type: 'joined', person })
    else if (person.pointingNodeId && person.pointingNodeId !== old.pointingNodeId) {
      changes.push({ type: 'pointed', person, nodeId: person.pointingNodeId })
    }
  }
  for (const [id, person] of was) {
    if (id !== self && !now.has(id)) changes.push({ type: 'left', person })
  }
  return changes
}
