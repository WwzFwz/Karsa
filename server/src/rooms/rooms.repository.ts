/**
 * Room metadata: what a dashboard card and a join page need to know about a
 * room without opening its document.
 */

import type { DatabaseSync } from 'node:sqlite'

export type RoomAccess = 'terkunci' | 'terbuka'

export interface RoomSummary {
  id: string
  title: string
  shape: string
  access: RoomAccess
  nodeCount: number
  people: { name: string; hue: number }[]
  createdAt: number
  updatedAt: number
}

interface Row {
  id: string
  title: string
  shape: string
  access: RoomAccess
  node_count: number
  people: string
  created_at: number
  updated_at: number
}

const toSummary = (row: Row): RoomSummary => ({
  id: row.id,
  title: row.title,
  shape: row.shape,
  access: row.access,
  nodeCount: row.node_count,
  people: JSON.parse(row.people) as RoomSummary['people'],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export class RoomsRepository {
  private readonly selectOne
  private readonly insertOne
  private readonly updateMeta
  private readonly updateSettings

  constructor(private readonly db: DatabaseSync) {
    this.selectOne = db.prepare('SELECT * FROM rooms WHERE id = ?')
    this.insertOne = db.prepare(
      'INSERT INTO rooms (id, title, shape, access, node_count, people, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    )
    this.updateMeta = db.prepare('UPDATE rooms SET title = ?, shape = ?, node_count = ?, people = ?, updated_at = ? WHERE id = ?')
    this.updateSettings = db.prepare('UPDATE rooms SET title = ?, access = ?, updated_at = ? WHERE id = ?')
  }

  find(id: string): RoomSummary | null {
    const row = this.selectOne.get(id) as Row | undefined
    return row ? toSummary(row) : null
  }

  findMany(ids: string[]): RoomSummary[] {
    if (ids.length === 0) return []
    const marks = ids.map(() => '?').join(', ')
    const rows = this.db.prepare(`SELECT * FROM rooms WHERE id IN (${marks})`).all(...ids) as unknown as Row[]
    return rows.map(toSummary).sort((a, b) => b.updatedAt - a.updatedAt)
  }

  insert(room: RoomSummary): void {
    this.insertOne.run(
      room.id,
      room.title,
      room.shape,
      room.access,
      room.nodeCount,
      JSON.stringify(room.people),
      room.createdAt,
      room.updatedAt,
    )
  }

  /** What the document says about itself, copied here each time it is stored. */
  recordDocument(id: string, meta: Pick<RoomSummary, 'title' | 'shape' | 'nodeCount' | 'people'>, at: number): void {
    this.updateMeta.run(meta.title, meta.shape, meta.nodeCount, JSON.stringify(meta.people), at, id)
  }

  updateSettingsOf(id: string, settings: Pick<RoomSummary, 'title' | 'access'>, at: number): void {
    this.updateSettings.run(settings.title, settings.access, at, id)
  }
}
