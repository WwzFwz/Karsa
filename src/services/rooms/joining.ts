/**
 * Getting into a room, and letting others in.
 *
 * The person outside: `enter` gives either a token (open room, or already a
 * member) or a place in the queue; `checkRequest` is polled until someone
 * answers. The people inside: `listRequests` and `answerRequest`.
 */

import { api } from './api'
import { forgetToken, readToken, rememberRoom, writeToken } from './membership'
import { getRoom, serverMode, type Me, type RoomSummary } from './rooms'

export type Entry =
  | { status: 'masuk'; room: RoomSummary | null }
  | { status: 'menunggu'; requestId: string; room: RoomSummary }
  | { status: 'ditolak'; room: RoomSummary }
  | { status: 'tidak-ada' }

export interface JoinRequest {
  id: string
  name: string
  hue: number
  via: 'kode' | 'tautan'
  askedAt: number
  status: 'menunggu' | 'diterima' | 'ditolak'
}

export async function enter(roomId: string, me: Me, via: 'kode' | 'tautan'): Promise<Entry> {
  if (!serverMode()) return { status: 'masuk', room: await getRoom(roomId) }
  const room = await getRoom(roomId)
  if (!room) return { status: 'tidak-ada' }
  // A member walks straight in; sync checks the token and sends them back here if it is stale.
  if (readToken(roomId)) return { status: 'masuk', room }

  const result = await api<{ status: 'masuk'; token: string } | { status: 'menunggu'; requestId: string }>(
    'POST',
    `/rooms/${encodeURIComponent(roomId)}/join`,
    { body: { ...me, via } },
  )
  if (result.status === 'menunggu') return { status: 'menunggu', requestId: result.requestId, room }
  writeToken(roomId, result.token)
  rememberRoom(roomId, 'bergabung')
  return { status: 'masuk', room }
}

export async function checkRequest(roomId: string, requestId: string, me: Me, room: RoomSummary): Promise<Entry> {
  const result = await api<{ status: JoinRequest['status']; token?: string }>(
    'GET',
    `/rooms/${encodeURIComponent(roomId)}/join/${requestId}?actorId=${me.actorId}`,
  )
  if (result.status === 'diterima' && result.token) {
    writeToken(roomId, result.token)
    rememberRoom(roomId, 'bergabung')
    return { status: 'masuk', room }
  }
  if (result.status === 'ditolak') return { status: 'ditolak', room }
  return { status: 'menunggu', requestId, room }
}

export async function withdraw(roomId: string, requestId: string, me: Me): Promise<void> {
  await api('DELETE', `/rooms/${encodeURIComponent(roomId)}/join/${requestId}?actorId=${me.actorId}`).catch(() => {})
}

/** The token was refused by sync: forget it, so the next entry asks again. */
export function leaveStale(roomId: string): void {
  forgetToken(roomId)
}

export async function listRequests(roomId: string): Promise<JoinRequest[]> {
  return api<JoinRequest[]>('GET', `/rooms/${encodeURIComponent(roomId)}/requests`, { token: readToken(roomId) })
}

export async function answerRequest(roomId: string, requestId: string, status: 'diterima' | 'ditolak'): Promise<JoinRequest> {
  return api<JoinRequest>('POST', `/rooms/${encodeURIComponent(roomId)}/requests/${requestId}`, {
    body: { status },
    token: readToken(roomId),
  })
}
