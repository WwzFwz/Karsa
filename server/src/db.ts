/**
 * One SQLite file for the whole server: room documents and room metadata.
 *
 * Node's own SQLite, so the container needs no native module to build -- the
 * part of a Node install that fails most often on Windows and in slim images.
 * Mode kelas uses this as is; mode lintas daerah swaps the two stores below for
 * PostgreSQL behind the same functions.
 */

import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export function openDatabase(file: string): DatabaseSync {
  mkdirSync(dirname(file), { recursive: true })
  const db = new DatabaseSync(file)
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      name TEXT PRIMARY KEY,
      state BLOB NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      shape TEXT NOT NULL,
      access TEXT NOT NULL,
      node_count INTEGER NOT NULL,
      people TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `)
  return db
}
