/**
 * The people at the door of locked rooms.
 *
 * Kept in memory on purpose (D37): a request is presence, not document. It
 * disappears when the person gives up waiting or the server restarts, and
 * nobody should be replaying it a week later. Someone still waiting after a
 * restart simply knocks again.
 */

import { randomBytes } from 'node:crypto'

export type RequestStatus = 'menunggu' | 'diterima' | 'ditolak'

export interface JoinRequest {
  id: string
  roomId: string
  actorId: string
  name: string
  hue: number
  via: 'kode' | 'tautan'
  askedAt: number
  status: RequestStatus
  answeredBy?: string
  /** Handed to the person who knocked, once, when they are let in. */
  token?: string
}

/** A request nobody answered is dropped after this long. */
const FORGET_AFTER_MS = 60 * 60_000
/** At most this many knocks per address per minute. */
const KNOCKS_PER_MINUTE = 10

export class JoinRequests {
  private readonly requests = new Map<string, JoinRequest>()
  private readonly knocks = new Map<string, number[]>()

  constructor(private readonly now: () => number = Date.now) {}

  /** Null when this address has knocked too often in the last minute. */
  knock(from: string, request: Pick<JoinRequest, 'roomId' | 'actorId' | 'name' | 'hue' | 'via'>): JoinRequest | null {
    this.forgetOld()
    const recent = (this.knocks.get(from) ?? []).filter((at) => at > this.now() - 60_000)
    if (recent.length >= KNOCKS_PER_MINUTE) return null
    this.knocks.set(from, [...recent, this.now()])

    // Knocking again while already waiting is the same request, not a new one.
    const existing = [...this.requests.values()].find(
      (r) => r.roomId === request.roomId && r.actorId === request.actorId && r.status === 'menunggu',
    )
    if (existing) return existing

    const made: JoinRequest = {
      ...request,
      id: `req_${randomBytes(6).toString('hex')}`,
      askedAt: this.now(),
      status: 'menunggu',
    }
    this.requests.set(made.id, made)
    return made
  }

  get(roomId: string, id: string): JoinRequest | null {
    const found = this.requests.get(id)
    return found && found.roomId === roomId ? found : null
  }

  forRoom(roomId: string): JoinRequest[] {
    this.forgetOld()
    return [...this.requests.values()].filter((r) => r.roomId === roomId).sort((a, b) => a.askedAt - b.askedAt)
  }

  answer(roomId: string, id: string, status: 'diterima' | 'ditolak', answeredBy: string, token?: string): JoinRequest | null {
    const found = this.get(roomId, id)
    if (!found || found.status !== 'menunggu') return null
    const next: JoinRequest = { ...found, status, answeredBy, token }
    this.requests.set(id, next)
    return next
  }

  /** The person gave up. */
  withdraw(roomId: string, id: string): boolean {
    const found = this.get(roomId, id)
    if (!found || found.status !== 'menunggu') return false
    this.requests.delete(id)
    return true
  }

  private forgetOld(): void {
    const cutoff = this.now() - FORGET_AFTER_MS
    for (const [id, request] of this.requests) if (request.askedAt < cutoff) this.requests.delete(id)
  }
}
