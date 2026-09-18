/**
 * Two devices in one room, against a real server.
 *
 *   npm run test:people
 *
 * `docs/status.md` names this as the gap nothing else covers: every decision
 * about what happens when two people change the same tree at the same moment --
 * D9's single last-write-wins parent field, D10's cycle recovery as a read-time
 * projection -- has been correct by argument and never once by experiment.
 *
 * These are not two tabs pretending. Each person is a separate document, a
 * separate store, a separate actor id and a separate socket, talking to a
 * server process started for the test. What is checked is the thing that is
 * hard to reason about and easy to get wrong: both sides converging on the same
 * tree, and the tree still being a tree afterwards.
 */

import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join as filePath } from 'node:path'
import { pathToFileURL } from 'node:url'
import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'

const dir = mkdtempSync(filePath(tmpdir(), 'karsa-people-'))
let base = ''
let ws = ''
let server
let store

const freePort = () =>
  new Promise((resolve) => {
    const probe = createServer().listen(0, () => {
      const { port } = probe.address()
      probe.close(() => resolve(port))
    })
  })

before(async () => {
  const outfile = 'node_modules/.cache/karsa-people/store.mjs'
  rmSync('node_modules/.cache/karsa-people', { recursive: true, force: true })
  await build({
    stdin: {
      contents: `
        export { YjsDocStore } from './src/store/YjsDocStore'
        export { buildEmptyDoc } from './src/store/seed/room'
        export { projectTree } from './src/core/tree/project'
      `,
      resolveDir: '.',
      loader: 'ts',
    },
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    // One Yjs instance, or the two documents would not recognise each other.
    external: ['yjs'],
    logLevel: 'warning',
  })
  store = await import(pathToFileURL(outfile).href)

  const port = await freePort()
  base = `http://localhost:${port}/api`
  ws = `ws://localhost:${port}/sync`
  server = spawn(process.execPath, ['--experimental-sqlite', '--no-warnings', 'dist/main.js'], {
    cwd: 'server',
    env: {
      ...process.env,
      PORT: String(port),
      KARSA_DATA: filePath(dir, 'people.sqlite'),
      KARSA_SECRET: 'rahasia-uji',
      KARSA_STATIC: filePath(dir, 'none'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  server.stderr.on('data', (d) => process.stderr.write(d))
  for (let i = 0; i < 100; i += 1) {
    try {
      if ((await fetch(`${base}/health`)).ok) return
    } catch {
      // Not up yet.
    }
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error('server did not start')
})

after(async () => {
  if (server && server.exitCode === null) {
    const exited = new Promise((resolve) => server.once('exit', resolve))
    server.kill()
    await exited
  }
  // Windows releases the database file a moment after the process exits.
  rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
})

const call = async (method, path, body, token) => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  return { status: res.status, body: text ? JSON.parse(text) : null }
}

/** One person on one device: their own doc, store, actor and socket. */
async function join(code, name, title) {
  // Actor ids are validated as a_ plus at least six characters, the same shape
  // a device mints for itself.
  const self = { id: `a_${name.toLowerCase()}00000001`, name, hue: 200 }
  // The store wants `id`; the room service wants `actorId`, and rejects anything
  // it did not ask for. Spreading one into the other sent neither.
  const { status, body } = await call('POST', `/rooms/${code}/join`, {
    actorId: self.id,
    name: self.name,
    hue: self.hue,
    via: 'kode',
  })
  // Fail here rather than handing an undefined token to the socket, which just
  // never connects and turns a wrong request into a five-minute timeout.
  if (!body?.token) throw new Error(`gagal masuk ${code} sebagai ${name}: ${status} ${JSON.stringify(body)}`)
  const ydoc = new Y.Doc()
  const docStore = new store.YjsDocStore({
    initial: store.buildEmptyDoc(code, title, self),
    self,
    ydoc,
    seedLocally: false,
  })
  const provider = new HocuspocusProvider({ url: ws, name: code, document: ydoc, token: body.token })
  await new Promise((resolve, reject) => {
    provider.on('synced', resolve)
    provider.on('authenticationFailed', () => reject(new Error(`token ditolak untuk ${name}`)))
    setTimeout(() => reject(new Error(`${name} tidak tersambung ke ${code}`)), 8000)
  })
  docStore.markLoaded()
  return {
    self,
    store: docStore,
    close: () => provider.destroy(),
    run: (command) => docStore.dispatch(command, { actorId: self.id, inputPath: 'keyboard' }),
    undo: () => docStore.undo(self.id),
    tree: () => store.projectTree(docStore.getDoc()),
  }
}

/**
 * The whole tree as one string: id, parent and title for every node in order.
 *
 * Preorder alone is not enough, and it hid a real divergence once already --
 * moving a node under its own preceding sibling leaves the sequence identical
 * and changes only the depth, so two devices that disagreed about the parent
 * looked settled.
 */
const shape = (person) => {
  const doc = person.store.getDoc()
  return person
    .tree()
    .preorder.map((id) => `${id}<${doc.nodes[id].parentId ?? '-'}>${doc.nodes[id].title}`)
    .join('|')
}

/** Both sides have stopped changing and agree. Polled, because the wire is real. */
async function settle(people, ms = 4000) {
  const started = Date.now()
  for (;;) {
    const shapes = people.map(shape)
    if (shapes.every((s) => s === shapes[0])) return
    if (Date.now() - started > ms) {
      throw new Error(['tidak konvergen dalam ' + ms + ' ms:', ...shapes].join(String.fromCharCode(10)))
    }
    await new Promise((r) => setTimeout(r, 50))
  }
}

let roomCount = 0
async function room(title = 'Rapat berdua') {
  roomCount += 1
  const code = `DUA-${String(100 + roomCount)}`
  const made = await call('POST', '/rooms', {
    id: code,
    title,
    access: 'terbuka',
    actorId: 'a_pembuat00001',
    name: 'Pembuat',
    hue: 10,
  })
  if (made.status !== 201) throw new Error(`gagal membuat ${code}: ${made.status} ${JSON.stringify(made.body)}`)
  const ani = await join(code, 'Ani', title)
  const budi = await join(code, 'Budi', title)
  await settle([ani, budi])
  return { code, ani, budi, close: () => [ani, budi].forEach((p) => p.close()) }
}

const titles = (person) => {
  const doc = person.store.getDoc()
  return person.tree().preorder.map((id) => doc.nodes[id].title)
}

describe('two people in one room', () => {
  it('both see what the other adds, and agree on the order', async () => {
    const r = await room()
    const root = r.ani.tree().preorder[0]
    r.ani.run({ type: 'createNode', parentId: root, kind: 'idea', title: 'Gagasan Ani' })
    r.budi.run({ type: 'createNode', parentId: root, kind: 'idea', title: 'Gagasan Budi' })
    await settle([r.ani, r.budi])
    const seen = titles(r.ani)
    assert.deepEqual(seen, titles(r.budi), 'urutan yang sama di kedua perangkat')
    assert.ok(seen.includes('Gagasan Ani') && seen.includes('Gagasan Budi'))
    r.close()
  })

  it('both name the other as the author, not "someone"', async () => {
    // The bug D76 caught in the browser: the sender's name read as "Seseorang"
    // because the narration looked at actors from the previous render.
    const r = await room()
    const root = r.ani.tree().preorder[0]
    r.ani.run({ type: 'createNode', parentId: root, kind: 'fact', title: 'Fakta dari Ani' })
    await settle([r.ani, r.budi])
    const doc = r.budi.store.getDoc()
    const event = doc.events.find((e) => e.payload.title === 'Fakta dari Ani')
    assert.ok(event, 'peristiwanya sampai')
    assert.equal(doc.actors[event.actorId]?.name, 'Ani')
    r.close()
  })

  it('renaming and moving the same node at the same moment both survive (D9)', async () => {
    /*
      The reason parentId is one last-write-wins field rather than a list of
      children. With a list, a rename and a move landing together could produce
      the node twice; with a field, the two writes touch different keys and
      neither is lost.
    */
    const r = await room()
    const root = r.ani.tree().preorder[0]
    r.ani.run({ type: 'createNode', parentId: root, kind: 'group', title: 'Kelompok' })
    r.ani.run({ type: 'createNode', parentId: root, kind: 'idea', title: 'Pindahkan saya' })
    await settle([r.ani, r.budi])

    const tree = r.ani.tree()
    const doc = r.ani.store.getDoc()
    const target = tree.preorder.find((id) => doc.nodes[id].title === 'Pindahkan saya')
    const group = tree.preorder.find((id) => doc.nodes[id].title === 'Kelompok')

    r.ani.run({ type: 'renameNode', id: target, title: 'Judul baru dari Ani' })
    r.budi.run({ type: 'moveNode', id: target, parentId: group })
    await settle([r.ani, r.budi])

    for (const person of [r.ani, r.budi]) {
      const after = person.store.getDoc()
      assert.equal(after.nodes[target].title, 'Judul baru dari Ani', 'judulnya bertahan')
      assert.equal(after.nodes[target].parentId, group, 'pemindahannya bertahan')
    }
    assert.equal(titles(r.ani).filter((t) => t === 'Judul baru dari Ani').length, 1, 'tidak terduplikasi')
    r.close()
  })

  it('crossing moves leave a tree, not a ring (D10)', async () => {
    /*
      The risk section 9 names outright. Ani puts A under B while Budi puts B
      under A; merged literally that is a cycle, and a cycle would break the
      outline and the audio walk for everybody. Recovery is a projection at read
      time, so what matters is that both devices read the same tree and that
      every node still reaches the root.
    */
    const r = await room()
    const root = r.ani.tree().preorder[0]
    r.ani.run({ type: 'createNode', parentId: root, kind: 'idea', title: 'A' })
    r.ani.run({ type: 'createNode', parentId: root, kind: 'idea', title: 'B' })
    await settle([r.ani, r.budi])

    const find = (title) => {
      const doc = r.ani.store.getDoc()
      return r.ani.tree().preorder.find((id) => doc.nodes[id].title === title)
    }
    const a = find('A')
    const b = find('B')

    r.ani.run({ type: 'moveNode', id: a, parentId: b })
    r.budi.run({ type: 'moveNode', id: b, parentId: a })
    await settle([r.ani, r.budi])

    for (const person of [r.ani, r.budi]) {
      const tree = person.tree()
      const doc = person.store.getDoc()
      assert.ok(tree.preorder.includes(a) && tree.preorder.includes(b), 'tidak ada simpul yang hilang')
      /*
        Walked through the projection, not through the document.

        D10 is deliberate about this: the merged document is allowed to hold a
        ring, and recovery is a pure function applied when it is read. Checking
        `doc.nodes[id].parentId` would be checking the thing D10 says not to fix,
        and it failed here exactly as designed. What has to be a tree is what
        the outline and the audio walk actually read.
      */
      for (const id of tree.preorder) {
        let at = id
        let steps = 0
        while (at && steps <= tree.preorder.length) {
          at = tree.byId.get(at)?.parentId ?? null
          steps += 1
        }
        assert.ok(steps <= tree.preorder.length, `lingkaran lewat ${doc.nodes[id].title}`)
      }
      // And every node is reachable from a root, so nothing is stranded.
      assert.equal(new Set(tree.preorder).size, tree.preorder.length, 'tidak ada simpul ganda')
    }
    assert.deepEqual(r.ani.tree().preorder, r.budi.tree().preorder, 'pemulihannya sama di kedua perangkat')
    r.close()
  })

  it('deleting a node while the other adds a child under it converges', async () => {
    const r = await room()
    const root = r.ani.tree().preorder[0]
    r.ani.run({ type: 'createNode', parentId: root, kind: 'idea', title: 'Akan dihapus' })
    await settle([r.ani, r.budi])
    const doomed = r.ani.tree().preorder.find((id) => r.ani.store.getDoc().nodes[id].title === 'Akan dihapus')

    r.budi.run({ type: 'createNode', parentId: doomed, kind: 'idea', title: 'Anak dari Budi' })
    r.ani.run({ type: 'deleteNode', id: doomed, mode: 'promote' })
    await settle([r.ani, r.budi])

    assert.deepEqual(titles(r.ani), titles(r.budi))
    // Promote, so the child outlives its parent rather than vanishing with it.
    assert.ok(titles(r.ani).includes('Anak dari Budi'), 'anaknya tidak ikut hilang')
    r.close()
  })

  it('a device that was away catches up when it comes back', async () => {
    const r = await room()
    const root = r.ani.tree().preorder[0]
    r.budi.close()
    r.ani.run({ type: 'createNode', parentId: root, kind: 'idea', title: 'Ditulis saat Budi pergi' })
    await new Promise((resolve) => setTimeout(resolve, 600))

    const again = await join(r.code, 'Budi', 'Rapat berdua')
    await settle([r.ani, again])
    assert.ok(titles(again).includes('Ditulis saat Budi pergi'))
    again.close()
    r.ani.close()
  })

  it('undo takes back only your own change (D75)', async () => {
    const r = await room()
    const root = r.ani.tree().preorder[0]
    r.ani.run({ type: 'createNode', parentId: root, kind: 'idea', title: 'Milik Ani' })
    await settle([r.ani, r.budi])
    r.budi.run({ type: 'createNode', parentId: root, kind: 'idea', title: 'Milik Budi' })
    await settle([r.ani, r.budi])

    r.ani.undo()
    await settle([r.ani, r.budi])
    for (const person of [r.ani, r.budi]) {
      assert.ok(!titles(person).includes('Milik Ani'), 'miliknya sendiri kembali')
      assert.ok(titles(person).includes('Milik Budi'), "milik orang lain tidak ikut terbawa")
    }
    r.close()
  })
})
