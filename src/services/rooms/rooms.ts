/**
 * Rooms: listing, making, and changing who gets in.
 *
 * Two modes, one interface. With a sync server (the normal case), rooms live on
 * the server and this device remembers which codes are its own. Without one
 * (`VITE_SYNC_URL=off`), rooms live only here, in localStorage, and nobody else
 * can reach them -- so there is no waiting room either.
 */

import { syncUrl } from '../../core/config'
import type { RoomShape } from '../../core/model/types'
import { api } from './api'
import { myRooms, readToken, rememberRoom, writeToken } from './membership'

/**
 * Who gets in. "terbuka": anyone with the code. "terkunci": the code gets you to
 * the door and somebody inside lets you in (D37).
 */
export type RoomAccess = 'terkunci' | 'terbuka'

export interface RoomSummary {
  id: string
  title: string
  shape: RoomShape
  access: RoomAccess
  nodeCount: number
  /** Milliseconds since epoch. */
  updatedAt: number
  people: { name: string; hue: number }[]
  /** This device joined it rather than made it. */
  shared?: boolean
}

export interface Me {
  actorId: string
  name: string
  hue: number
}

/** The room every install carries, with sample content (D39). */
export const DEMO_ROOM_ID = 'KUR-482'

export function serverMode(): boolean {
  return syncUrl() !== null
}

export async function listRooms(): Promise<RoomSummary[]> {
  if (!serverMode()) return local.list()
  const mine = myRooms()
  const ids = [DEMO_ROOM_ID, ...mine.map((room) => room.id)]
  const rooms = await api<RoomSummary[]>('GET', `/rooms?ids=${encodeURIComponent([...new Set(ids)].join(','))}`)
  const role = new Map(mine.map((room) => [room.id, room.role]))
  return rooms.map((room) => ({ ...room, shared: role.get(room.id) !== 'dibuat' }))
}

export async function getRoom(id: string): Promise<RoomSummary | null> {
  if (!serverMode()) return local.find(id)
  try {
    return await api<RoomSummary>('GET', `/rooms/${encodeURIComponent(id)}`)
  } catch (error) {
    if ((error as { status?: number }).status === 404) return null
    throw error
  }
}

export async function createRoom(me: Me, title: string, options: { id: string; access: RoomAccess }): Promise<RoomSummary> {
  const named = title.trim() || 'Ruang tanpa nama'
  if (!serverMode()) return local.create(named, options)
  const { room, token } = await api<{ room: RoomSummary; token: string }>('POST', '/rooms', {
    body: { ...me, title: named, access: options.access, id: options.id },
  })
  writeToken(room.id, token)
  rememberRoom(room.id, 'dibuat')
  return room
}

export async function setRoomAccess(id: string, access: RoomAccess): Promise<void> {
  if (!serverMode()) return local.setAccess(id, access)
  await api('PATCH', `/rooms/${encodeURIComponent(id)}`, { body: { access }, token: readToken(id) })
}

/**
 * A code is minted before the room exists, so the dialog that makes a room can
 * show it while the name is still being typed. The server swaps it if taken.
 */
export function newRoomCode(): string {
  return `RUANG-${Math.floor(100 + Math.random() * 900)}`
}

/** A stable colour per name, so the same person is the same colour everywhere. */
export function hueFor(name: string): number {
  let hash = 0
  for (const char of name.trim().toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) % 360
  return hash
}

const LAST_KEY = 'karsa:ruang-terakhir'

/** So the dashboard can offer a way back into the room you just left. */
export function rememberLastRoom(id: string): void {
  try {
    localStorage.setItem(LAST_KEY, id)
  } catch {
    // Losing the breadcrumb is survivable; every room is still in the list.
  }
}

export function lastRoom(): string | null {
  try {
    return localStorage.getItem(LAST_KEY)
  } catch {
    return null
  }
}

const MINUTE = 60_000

/** "12 menit lalu", in the one place that needs it. */
export function agoLabel(at: number, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - at) / MINUTE))
  if (minutes < 1) return 'baru saja'
  if (minutes < 60) return `${minutes} menit lalu`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.round(hours / 24)
  return days === 1 ? 'kemarin' : `${days} hari lalu`
}

/* --- without a server: rooms on this device only --------------------------- */

const LOCAL_KEY = 'karsa:ruang'

const demo = (): RoomSummary => ({
  id: DEMO_ROOM_ID,
  title: 'Rapat Kurikulum Semester Genap',
  shape: 'mindmap',
  access: 'terbuka',
  nodeCount: 20,
  updatedAt: Date.now(),
  people: [],
})

const local = {
  read(): RoomSummary[] {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]')
      // Rooms stored before access existed read as locked, never as open.
      return Array.isArray(parsed) ? (parsed as RoomSummary[]).map((r) => ({ ...r, access: r.access ?? 'terkunci' })) : []
    } catch {
      return []
    }
  },
  write(rooms: RoomSummary[]): void {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(rooms))
    } catch {
      // Not being able to remember a new room is not a reason to refuse making it.
    }
  },
  list(): RoomSummary[] {
    return [...local.read(), demo()].sort((a, b) => b.updatedAt - a.updatedAt)
  },
  find(id: string): RoomSummary | null {
    return local.list().find((room) => room.id === id) ?? null
  },
  create(title: string, options: { id: string; access: RoomAccess }): RoomSummary {
    const room: RoomSummary = { id: options.id, title, shape: 'mindmap', access: options.access, nodeCount: 1, updatedAt: Date.now(), people: [] }
    local.write([room, ...local.read()])
    return room
  },
  setAccess(id: string, access: RoomAccess): void {
    local.write(local.read().map((room) => (room.id === id ? { ...room, access } : room)))
  },
}
