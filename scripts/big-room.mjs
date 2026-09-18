/**
 * Fills a room with as many nodes as a real workshop produces.
 *
 *   node scripts/big-room.mjs [count] [code]
 *
 * The sample room has 24 nodes and every promise in section 10 about how the
 * canvas feels was only ever checked against that. This builds a room the
 * honest size through the same door a device uses -- HTTP to make it, the sync
 * socket to fill it -- so what the browser then opens is a real room, not a
 * fixture with different rules.
 */

import { build } from 'esbuild'
import { rmSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'

const count = Number(process.argv[2] ?? 200)
const code = process.argv[3] ?? 'BIG-200'
const api = 'http://localhost:3000/api'
const sync = 'ws://localhost:3000/sync'

const outfile = 'node_modules/.cache/karsa-bench/store.mjs'
rmSync('node_modules/.cache/karsa-bench', { recursive: true, force: true })
await build({
  stdin: {
    contents: `
      export { YjsDocStore } from './src/store/YjsDocStore'
      export { buildEmptyDoc } from './src/store/seed/room'
    `,
    resolveDir: '.',
    loader: 'ts',
  },
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  external: ['yjs'],
  logLevel: 'warning',
})
const { YjsDocStore, buildEmptyDoc } = await import(pathToFileURL(outfile).href)

const post = async (path, body, token) => {
  const res = await fetch(api + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${await res.text()}`)
  return res.json()
}

const me = { id: 'a_pengisi', name: 'Pengisi' }
await post('/rooms', { id: code, title: `Ruang ${count} simpul`, access: 'terbuka', actorId: me.id, name: me.name, hue: 210 })
const { token } = await post(`/rooms/${code}/join`, { actorId: me.id, name: me.name, hue: 210, via: 'kode' })

const doc = new Y.Doc()
const store = new YjsDocStore({ initial: buildEmptyDoc(code, `Ruang ${count} simpul`, me), self: me, ydoc: doc, seedLocally: false })
const provider = new HocuspocusProvider({ url: sync, name: code, document: doc, token })
await new Promise((resolve) => provider.on('synced', resolve))
store.markLoaded()

const ids = Object.keys(store.getDoc().nodes)
let made = ids.length
let i = 0
const started = Date.now()
while (made < count) {
  const result = store.dispatch(
    { type: 'createNode', parentId: ids[i % ids.length], kind: 'idea', title: `Gagasan nomor ${made} dari rapat yang panjang` },
    { actorId: me.id, inputPath: 'keyboard' },
  )
  if (!result.ok) throw new Error(result.violation.message)
  const created = result.events.find((e) => e.type === 'createNode')?.payload.nodeId
  if (created) ids.push(created)
  made += 1
  if (made % 6 === 0) i += 1
}
console.log(`${made} simpul dalam ${Date.now() - started} ms`)
// Let the last update reach the server before closing the socket.
await new Promise((r) => setTimeout(r, 1500))
provider.destroy()
console.log(`selesai: buka http://localhost:5173/ruang/${code}`)
process.exit(0)
