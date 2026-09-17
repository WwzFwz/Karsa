/**
 * Join tokens: proof that a device was let into one room.
 *
 * No accounts, so a token names a room and an actor id, signed with the
 * server's secret. It is checked twice: by the room service before a member
 * may change the room or answer a knock, and by sync before a connection may
 * read or write the document.
 *
 * Accepted limit (D79): a token cannot be revoked before it expires.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'

export interface Member {
  roomId: string
  actorId: string
  name: string
  /** Milliseconds since epoch. */
  expiresAt: number
}

const encode = (value: string | Buffer) => Buffer.from(value).toString('base64url')

export class Tokens {
  constructor(
    private readonly secret: string,
    private readonly days: number,
    private readonly now: () => number = Date.now,
  ) {}

  issue(roomId: string, actorId: string, name: string): string {
    const member: Member = { roomId, actorId, name, expiresAt: this.now() + this.days * 86_400_000 }
    const body = encode(JSON.stringify(member))
    return `${body}.${this.sign(body)}`
  }

  /** The member a token speaks for, or null when it is forged, expired or for another room. */
  verify(token: string | undefined | null, roomId: string): Member | null {
    if (!token) return null
    const [body, signature] = token.split('.')
    if (!body || !signature) return null
    const expected = Buffer.from(this.sign(body))
    const given = Buffer.from(signature)
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
    try {
      const member = JSON.parse(Buffer.from(body, 'base64url').toString()) as Member
      if (member.roomId !== roomId || member.expiresAt < this.now()) return null
      return member
    } catch {
      return null
    }
  }

  private sign(body: string): string {
    return createHmac('sha256', this.secret).update(body).digest('base64url')
  }
}
