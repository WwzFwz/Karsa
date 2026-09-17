/**
 * How a new room's document starts, using the client's own code.
 *
 * Bundled into dist/seed.bundle.mjs by build-seed.mjs, so the server writes the
 * first root node and its event with exactly the same rules and shape as the
 * app (core/ and store/), instead of a second copy that could drift. `yjs` is
 * left external so the bundle shares the server's Yjs instance.
 */

import * as Y from 'yjs'
import type { Actor } from '../../src/core/model/types'
import { buildEmptyDoc, buildSeedDoc } from '../../src/store/seed/room'
import { YjsDocStore } from '../../src/store/YjsDocStore'

export interface SeedInput {
  id: string
  title: string
  creator: Actor
  /** The one room that carries sample content (D39). */
  demo?: boolean
}

/** The document of a room that nobody has opened yet, as one Yjs update. */
export function seedRoom({ id, title, creator, demo }: SeedInput): Uint8Array {
  const ydoc = new Y.Doc()
  const initial = demo ? buildSeedDoc(creator) : buildEmptyDoc(id, title, creator)
  new YjsDocStore({ initial, self: creator, ydoc }).markLoaded()
  return Y.encodeStateAsUpdate(ydoc)
}

/** What a dashboard card needs, read from a stored document. */
export function describeRoom(state: Uint8Array): {
  title: string
  shape: string
  nodeCount: number
  people: { name: string; hue: number }[]
} {
  const ydoc = new Y.Doc()
  Y.applyUpdate(ydoc, state)
  const room = ydoc.getMap('room')
  const actors = [...ydoc.getMap<{ displayName: string; hue: number }>('actors').values()]
  return {
    title: String(room.get('title') ?? ''),
    shape: String(room.get('shape') ?? 'mindmap'),
    nodeCount: ydoc.getMap('nodes').size,
    people: actors.slice(0, 5).map((a) => ({ name: a.displayName, hue: a.hue })),
  }
}
