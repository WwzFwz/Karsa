/**
 * Room documents on disk, one row per room.
 *
 * Node's own SQLite, so the container needs no native module to build -- the
 * part of a Node install that fails most often on Windows and in slim images.
 * Mode kelas uses this file as is; mode lintas daerah swaps it for PostgreSQL
 * behind the same two functions.
 */

import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export interface DocumentStorage {
  load(name: string): Uint8Array | null
  save(name: string, state: Uint8Array): void
  close(): void
}

export function openStorage(file: string): DocumentStorage {
  mkdirSync(dirname(file), { recursive: true })
  const db = new DatabaseSync(file)
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      name TEXT PRIMARY KEY,
      state BLOB NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)
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
    close() {
      db.close()
    },
  }
}
