/**
 * The list of rooms a person can open.
 *
 * Mock data with one real exception: KUR-482 is the room the workspace actually
 * seeds, so opening it from the dashboard lands somewhere with content. Rooms
 * created here are remembered on the device, which is enough to make the button
 * feel real without a server.
 */

import type { RoomShape } from '../../core/model/types'

/**
 * Who gets in.
 *
 * The two states Drive and Zoom both landed on, named for what they do rather
 * than for a permission model this product does not have. "terbuka" is Zoom
 * with the waiting room off; "terkunci" is Drive's Restricted and Zoom's
 * waiting room at once -- the code still gets you to the door, but somebody
 * inside has to open it.
 */
export type RoomAccess = 'terkunci' | 'terbuka'

export interface RoomSummary {
  id: string
  title: string
  shape: RoomShape
  nodeCount: number
  /** Milliseconds since epoch. */
  updatedAt: number
  access: RoomAccess
  people: { name: string; hue: number }[]
  /** Someone else opened this room and shared the code. */
  shared?: boolean
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const STORE_KEY = 'karsa:ruang'

function seeded(now: number): RoomSummary[] {
  return [
    {
      id: 'KUR-482',
      title: 'Rapat Kurikulum Semester Genap',
      shape: 'mindmap',
      access: 'terkunci',
      nodeCount: 20,
      updatedAt: now - 12 * MINUTE,
      people: [
        { name: 'Rina Halimah', hue: 268 },
        { name: 'Budi Santoso', hue: 24 },
        { name: 'Sari Wulandari', hue: 152 },
        { name: 'Teguh Prasetyo', hue: 202 },
      ],
    },
    {
      id: 'AKR-119',
      title: 'Akreditasi: bukti dan penanggung jawab',
      shape: 'columns',
      access: 'terkunci',
      nodeCount: 34,
      updatedAt: now - 5 * HOUR,
      people: [
        { name: 'Teguh Prasetyo', hue: 202 },
        { name: 'Rina Halimah', hue: 268 },
      ],
    },
    {
      id: 'ONB-207',
      title: 'Alur pendaftaran mahasiswa baru',
      shape: 'flow',
      access: 'terbuka',
      nodeCount: 27,
      updatedAt: now - 2 * DAY,
      people: [{ name: 'Sari Wulandari', hue: 152 }],
      shared: true,
    },
    {
      id: 'RIS-058',
      title: 'Riset kebutuhan aksesibilitas kelas',
      shape: 'hierarchy',
      access: 'terbuka',
      nodeCount: 16,
      updatedAt: now - 6 * DAY,
      people: [
        { name: 'Budi Santoso', hue: 24 },
        { name: 'Sari Wulandari', hue: 152 },
      ],
      shared: true,
    },
  ]
}

function read(): RoomSummary[] {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Rooms stored before access existed read as locked, never as open. A
    // missing field must not quietly widen who can get in.
    return (parsed as RoomSummary[]).map((room) => ({ ...room, access: room.access ?? 'terkunci' }))
  } catch {
    // Blocked storage or a stale shape. An empty extra list is harmless.
    return []
  }
}

function write(rooms: RoomSummary[]): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(rooms))
  } catch {
    // Not being able to remember a new room is not a reason to refuse making it.
  }
}

export function listRooms(now = Date.now()): RoomSummary[] {
  return [...read(), ...seeded(now)].sort((a, b) => b.updatedAt - a.updatedAt)
}

/**
 * A code is minted before the room exists, so the dialog that makes a room can
 * show the code while you are still filling the name in -- that code is the
 * only thing that actually lets anyone else in.
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

export function createRoom(
  title: string,
  options: { id?: string; invited?: string[]; access?: RoomAccess } = {},
): RoomSummary {
  const room: RoomSummary = {
    id: options.id ?? newRoomCode(),
    title: title.trim() || 'Ruang tanpa nama',
    shape: 'mindmap',
    access: options.access ?? 'terkunci',
    // The room opens with one root node carrying its name; see buildEmptyDoc.
    nodeCount: 1,
    updatedAt: Date.now(),
    people: (options.invited ?? []).map((name) => ({ name, hue: hueFor(name) })),
  }
  write([room, ...read()])
  return room
}

export function findRoom(id: string): RoomSummary | null {
  return listRooms().find((room) => room.id === id) ?? null
}

export function setRoomAccess(id: string, access: RoomAccess): void {
  const own = read()
  const index = own.findIndex((room) => room.id === id)
  if (index >= 0) {
    own[index] = { ...own[index], access }
    write(own)
    return
  }
  // A seeded room is not in the writable list yet. Copy it in, changed.
  const seed = listRooms().find((room) => room.id === id)
  if (seed) write([{ ...seed, access }, ...own])
}

export function forgetRoom(id: string): void {
  write(read().filter((room) => room.id !== id))
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
