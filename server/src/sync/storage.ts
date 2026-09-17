/**
 * Room documents on disk, one row per room, as Yjs updates.
 */

import type { DatabaseSync } from 'node:sqlite'

export interface DocumentStorage {
  load(name: string): Uint8Array | null
  save(name: string, state: Uint8Array): void
}

export function documentStorage(db: DatabaseSync): DocumentStorage {
  const select = db.prepare('SELECT state FROM documents WHERE name = ?')
  const upsert = db.prepare(`
    INSERT INTO documents (name, state, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at
  `)

  return {
    load(name) {
      const row = select.get(name) as { state: Uint8Array } | undefined
      return row ? new Uint8Array(row.state) : null
    },
    save(name, state) {
      upsert.run(name, state, Date.now())
    },
  }
}
