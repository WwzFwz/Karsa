/**
 * The list of rooms a person can open.
 *
 * Mock data with one real exception: KUR-482 is the room the workspace actually
 * seeds, so opening it from the dashboard lands somewhere with content. Rooms
 * created here are remembered on the device, which is enough to make the button
 * feel real without a server.
 */

import type { RoomShape } from '../../core/model/types'

export interface RoomSummary {
  id: string
  title: string
  shape: RoomShape
  nodeCount: number
  /** Milliseconds since epoch. */
  updatedAt: number
  people: { name: string; hue: number }[]
  /** Someone else opened this room and shared the code. */
  shared?: boolean
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const STORE_KEY = 'kanvas-setara:ruang'

function seeded(now: number): RoomSummary[] {
  return [
    {
      id: 'KUR-482',
      title: 'Rapat Kurikulum Semester Genap',
      shape: 'mindmap',
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
      nodeCount: 27,
      updatedAt: now - 2 * DAY,
      people: [{ name: 'Sari Wulandari', hue: 152 }],
      shared: true,
    },
    {
      id: 'RIS-058',
      title: 'Riset kebutuhan aksesibilitas kelas',
      shape: 'hierarchy',
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
    return Array.isArray(parsed) ? (parsed as RoomSummary[]) : []
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

export function createRoom(title: string): RoomSummary {
  const code = `RUANG-${Math.floor(100 + Math.random() * 900)}`
  const room: RoomSummary = {
    id: code,
    title: title.trim() || 'Ruang tanpa nama',
    shape: 'mindmap',
    nodeCount: 0,
    updatedAt: Date.now(),
    people: [],
  }
  write([room, ...read()])
  return room
}

export function forgetRoom(id: string): void {
  write(read().filter((room) => room.id !== id))
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
