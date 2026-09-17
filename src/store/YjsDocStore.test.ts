import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import * as Y from 'yjs'
import type { Command } from '../core/commands/types'
import type { DocEvent } from '../core/events/types'
import type { Actor } from '../core/model/types'
import { projectTree } from '../core/tree/project'
import { buildEmptyDoc } from './seed/room'
import { YjsDocStore } from './YjsDocStore'

/*
  Two devices in one process. Updates are passed by hand, so each test decides
  exactly when the devices hear from each other -- including not at all, which
  is how concurrent edits are made.
*/

const ANI: Actor = { id: 'a_ani', displayName: 'Ani', hue: 10 }
const BAYU: Actor = { id: 'a_bayu', displayName: 'Bayu', hue: 200 }

function device(self: Actor) {
  const store = new YjsDocStore({
    initial: buildEmptyDoc('TES-001', 'Rapat uji', ANI),
    self,
  })
  store.markLoaded()
  const heard: DocEvent[] = []
  store.subscribeRemoteEvents((events) => heard.push(...events))
  return { store, heard, as: { actorId: self.id, inputPath: 'keyboard' as const } }
}

/** Sends everything each side is missing to the other. */
function sync(a: YjsDocStore, b: YjsDocStore) {
  Y.applyUpdate(b.ydoc, Y.encodeStateAsUpdate(a.ydoc, Y.encodeStateVector(b.ydoc)), 'remote')
  Y.applyUpdate(a.ydoc, Y.encodeStateAsUpdate(b.ydoc, Y.encodeStateVector(a.ydoc)), 'remote')
}

const add = (title: string, parentId: string | null = 'n_akar'): Command => ({
  type: 'createNode',
  parentId,
  kind: 'idea',
  title,
})

const idOf = (store: YjsDocStore, title: string) =>
  Object.values(store.getDoc().nodes).find((n) => n.title === title)?.id

describe('one device', () => {
  it('seeds the room once, from the initial document', () => {
    const { store } = device(ANI)
    assert.equal(store.getDoc().room.title, 'Rapat uji')
    assert.equal(store.getDoc().nodes.n_akar.title, 'Rapat uji')
    assert.equal(store.getDoc().events.length, 1)
  })

  it('a command lands in Yjs, and a fresh device reading the same bytes sees it', () => {
    const { store, as } = device(ANI)
    store.dispatch(add('Pelatihan dosen'), as)
    const copy = new Y.Doc()
    Y.applyUpdate(copy, Y.encodeStateAsUpdate(store.ydoc))
    const reader = new YjsDocStore({ initial: store.getDoc(), self: ANI, ydoc: copy })
    assert.ok(idOf(reader, 'Pelatihan dosen'))
    assert.equal(reader.getDoc().events.length, 2)
  })

  it('an untouched node keeps its identity, so React can skip it', () => {
    const { store, as } = device(ANI)
    const root = store.getDoc().nodes.n_akar
    store.dispatch(add('Pelatihan dosen'), as)
    assert.equal(store.getDoc().nodes.n_akar, root)
  })

  it('a refused command writes nothing', () => {
    const { store, as } = device(ANI)
    const before = store.getDoc()
    const result = store.dispatch(add('x'.repeat(200)), as)
    assert.equal(result.ok, false)
    assert.equal(store.getDoc(), before)
  })
})

describe('undo takes back only your own change (D21)', () => {
  it('removes what this device added and leaves the other person\'s edit', () => {
    const ani = device(ANI)
    const bayu = device(BAYU)
    sync(ani.store, bayu.store)

    ani.store.dispatch(add('Usulan Ani'), ani.as)
    sync(ani.store, bayu.store)
    bayu.store.dispatch({ type: 'renameNode', id: 'n_akar', title: 'Rapat diganti Bayu' }, bayu.as)
    sync(ani.store, bayu.store)

    const event = ani.store.undo(ANI.id)
    sync(ani.store, bayu.store)

    for (const store of [ani.store, bayu.store]) {
      assert.equal(idOf(store, 'Usulan Ani'), undefined)
      assert.equal(store.getDoc().nodes.n_akar.title, 'Rapat diganti Bayu')
    }
    assert.equal(event?.type, 'undo')
    assert.equal(event?.payload.title, 'Usulan Ani')
  })

  it('a template batch is one undo step', () => {
    const { store, as } = device(ANI)
    store.dispatchBatch([add('Satu'), add('Dua'), add('Tiga')], as)
    const event = store.undo(ANI.id)
    assert.equal(Object.keys(store.getDoc().nodes).length, 1)
    assert.equal(event?.payload.undoneCount, 3)
  })

  it('the log keeps growing: the undone event and the undo are both there', () => {
    const { store, as } = device(ANI)
    store.dispatch(add('Sementara'), as)
    store.undo(ANI.id)
    assert.deepEqual(
      store.getDoc().events.map((e) => e.type),
      ['createNode', 'createNode', 'undo'],
    )
    assert.equal(store.canUndo(), false)
  })
})

describe('two devices at once', () => {
  it('renaming and moving the same node concurrently keeps both', () => {
    const ani = device(ANI)
    const bayu = device(BAYU)
    ani.store.dispatch(add('Kelompok'), ani.as)
    ani.store.dispatch(add('Catatan'), ani.as)
    sync(ani.store, bayu.store)
    const note = idOf(ani.store, 'Catatan')!
    const group = idOf(ani.store, 'Kelompok')!

    ani.store.dispatch({ type: 'renameNode', id: note, title: 'Catatan rapat' }, ani.as)
    bayu.store.dispatch({ type: 'moveNode', id: note, parentId: group }, bayu.as)
    sync(ani.store, bayu.store)

    for (const store of [ani.store, bayu.store]) {
      assert.equal(store.getDoc().nodes[note].title, 'Catatan rapat')
      assert.equal(store.getDoc().nodes[note].parentId, group)
    }
  })

  it('crossing moves end in the same repaired tree on both devices (D10)', () => {
    const ani = device(ANI)
    const bayu = device(BAYU)
    ani.store.dispatch(add('A'), ani.as)
    ani.store.dispatch(add('B'), ani.as)
    sync(ani.store, bayu.store)
    const a = idOf(ani.store, 'A')!
    const b = idOf(ani.store, 'B')!

    ani.store.dispatch({ type: 'moveNode', id: a, parentId: b }, ani.as)
    bayu.store.dispatch({ type: 'moveNode', id: b, parentId: a }, bayu.as)
    sync(ani.store, bayu.store)

    const treeA = projectTree(ani.store.getDoc())
    const treeB = projectTree(bayu.store.getDoc())
    assert.ok(treeA.repairs.length > 0)
    assert.deepEqual(treeA.preorder, treeB.preorder)
  })

  it('announces what arrived from the other device, and not what you did yourself', () => {
    const ani = device(ANI)
    const bayu = device(BAYU)
    sync(ani.store, bayu.store)
    ani.store.dispatch(add('Dari Ani'), ani.as)
    sync(ani.store, bayu.store)

    assert.deepEqual(bayu.heard.map((e) => e.payload.title), ['Dari Ani'])
    assert.equal(ani.heard.length, 0)
  })

  it('does not read old history aloud when a room is opened', () => {
    const ani = device(ANI)
    ani.store.dispatch(add('Kemarin'), ani.as)
    const late = new YjsDocStore({
      initial: buildEmptyDoc('TES-001', 'Rapat uji', BAYU),
      self: BAYU,
      now: () => Date.now() + 60 * 60_000,
    })
    const heard: DocEvent[] = []
    late.subscribeRemoteEvents((events) => heard.push(...events))
    Y.applyUpdate(late.ydoc, Y.encodeStateAsUpdate(ani.store.ydoc), 'remote')
    assert.ok(idOf(late, 'Kemarin'))
    assert.equal(heard.length, 0)
  })

  it('each device puts its own name in the document', () => {
    const ani = device(ANI)
    const bayu = device(BAYU)
    sync(ani.store, bayu.store)
    assert.equal(ani.store.getDoc().actors[BAYU.id]?.displayName, 'Bayu')
  })
})

describe('a room the server owns (D79)', () => {
  it('is not seeded by this device, and writes wait until it arrives', () => {
    const store = new YjsDocStore({
      initial: buildEmptyDoc('TES-002', 'Milik server', ANI),
      self: ANI,
      seedLocally: false,
    })
    store.markLoaded()
    assert.equal(store.ydoc.getMap('room').size, 0, 'no second root invented')
    const result = store.dispatch(add('Terlalu cepat'), { actorId: ANI.id, inputPath: 'keyboard' })
    assert.equal(result.ok, false)

    const server = device(BAYU)
    Y.applyUpdate(store.ydoc, Y.encodeStateAsUpdate(server.store.ydoc), 'remote')
    store.markLoaded()
    assert.equal(store.dispatch(add('Sekarang boleh'), { actorId: ANI.id, inputPath: 'keyboard' }).ok, true)
    assert.equal(store.getDoc().events.filter((e) => e.type === 'createNode' && !e.payload.title?.startsWith('Sekarang')).length, 1)
  })
})
