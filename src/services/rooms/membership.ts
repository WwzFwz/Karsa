/**
 * What this device remembers about rooms: which codes it has been in, whether
 * it made them, and the join token for each.
 *
 * No accounts, so "my rooms" is exactly this list. Clearing the browser's data
 * forgets it -- the rooms themselves stay on the server, and the code still
 * gets you back in.
 */

export type Role = 'dibuat' | 'bergabung'

const ROOMS_KEY = 'karsa:ruang-saya'
const tokenKey = (roomId: string) => `karsa:token:${roomId}`

function safe<T>(read: () => T, fallback: T): T {
  try {
    return read()
  } catch {
    // Blocked storage: the room still works for this visit.
    return fallback
  }
}

export function myRooms(): { id: string; role: Role }[] {
  return safe(() => {
    const parsed: unknown = JSON.parse(localStorage.getItem(ROOMS_KEY) ?? '[]')
    return Array.isArray(parsed) ? (parsed as { id: string; role: Role }[]) : []
  }, [])
}

export function rememberRoom(id: string, role: Role): void {
  safe(() => {
    const others = myRooms().filter((room) => room.id !== id)
    // Having made a room is never downgraded by joining it again.
    const had = myRooms().find((room) => room.id === id)
    const next = { id, role: had?.role === 'dibuat' ? 'dibuat' : role }
    localStorage.setItem(ROOMS_KEY, JSON.stringify([next, ...others]))
  }, undefined)
}

export function readToken(roomId: string): string | null {
  return safe(() => localStorage.getItem(tokenKey(roomId)), null)
}

export function writeToken(roomId: string, token: string): void {
  safe(() => localStorage.setItem(tokenKey(roomId), token), undefined)
}

/** When the server no longer accepts it: expired, or signed with an old secret. */
export function forgetToken(roomId: string): void {
  safe(() => localStorage.removeItem(tokenKey(roomId)), undefined)
}
