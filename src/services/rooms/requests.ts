/**
 * The waiting room.
 *
 * A locked room's code gets you to the door, not through it. People who use the
 * code land here, and somebody already inside decides. This is Zoom's waiting
 * room rather than Drive's share sheet, and the difference matters: Drive
 * answers a request in an inbox, hours later, which is useless when the meeting
 * is happening now. Zoom answers it in the participants panel, in the same
 * second, which is why the list lives beside the people who are already here.
 *
 * Mock storage. In the real product a request is presence, not document -- it
 * belongs on the Awareness channel with the cursors, because it disappears when
 * the person gives up waiting and nobody should be replaying it a week later.
 *
 * An answered request is kept until the session ends rather than deleted, so
 * the panel can say what happened. Rule 5: every answer is one sentence.
 */

export type RequestStatus = 'menunggu' | 'diterima' | 'ditolak'

export interface JoinRequest {
  id: string
  roomId: string
  name: string
  /** How they got to the door. Shown because "who is this" is the whole question. */
  via: 'kode' | 'tautan'
  email?: string
  hue: number
  askedAt: number
  status: RequestStatus
}

const MINUTE = 60_000

function seeded(now: number): JoinRequest[] {
  return [
    {
      id: 'req_dewi',
      roomId: 'KUR-482',
      name: 'Dewi Anggraini',
      email: 'dewi.anggraini@kampus.ac.id',
      via: 'tautan',
      hue: 12,
      askedAt: now - 2 * MINUTE,
      status: 'menunggu',
    },
    {
      id: 'req_hendra',
      roomId: 'KUR-482',
      name: 'Hendra Wijaya',
      via: 'kode',
      hue: 190,
      askedAt: now - 40_000,
      status: 'menunggu',
    },
  ]
}

let all: JoinRequest[] = seeded(Date.now())
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * One array identity per change, so `useSyncExternalStore` can compare by
 * reference without a selector that allocates on every read.
 */
export function snapshot(): JoinRequest[] {
  return all
}

export function waitingFor(roomId: string): JoinRequest[] {
  return all.filter((request) => request.roomId === roomId && request.status === 'menunggu')
}

export function answeredFor(roomId: string): JoinRequest[] {
  return all.filter((request) => request.roomId === roomId && request.status !== 'menunggu')
}

export function answer(id: string, status: Exclude<RequestStatus, 'menunggu'>): JoinRequest | null {
  const found = all.find((request) => request.id === id)
  if (!found || found.status !== 'menunggu') return null
  const next = { ...found, status }
  all = all.map((request) => (request.id === id ? next : request))
  emit()
  return next
}

/** Everyone still at the door, answered at once. Zoom calls it "admit all". */
export function answerAll(
  roomId: string,
  status: Exclude<RequestStatus, 'menunggu'>,
): JoinRequest[] {
  const affected = waitingFor(roomId)
  if (affected.length === 0) return []
  all = all.map((request) =>
    request.roomId === roomId && request.status === 'menunggu' ? { ...request, status } : request,
  )
  emit()
  return affected
}

/** Used by the mock to make a knock happen on demand. */
export function knock(request: Omit<JoinRequest, 'id' | 'askedAt' | 'status'>): JoinRequest {
  const made: JoinRequest = {
    ...request,
    id: `req_${Math.random().toString(36).slice(2, 8)}`,
    askedAt: Date.now(),
    status: 'menunggu',
  }
  all = [...all, made]
  emit()
  return made
}
