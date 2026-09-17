/**
 * Two clients, one room, a real server: does a change on one arrive on the
 * other, and is it still there for a third client after everyone left?
 *
 *   npm run smoke:sync -- ws://localhost:3000/sync   (server must be running)
 */

import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'

const url = process.argv[2] ?? 'ws://localhost:3000/sync'
const room = `TES-${Math.floor(Math.random() * 900 + 100)}`
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

function client() {
  const document = new Y.Doc()
  const provider = new HocuspocusProvider({ url, name: room, document })
  const synced = new Promise((resolve) => provider.on('synced', resolve))
  return { document, provider, synced }
}

async function until(check, label, ms = 5000) {
  const start = Date.now()
  while (!check()) {
    if (Date.now() - start > ms) throw new Error(`Tidak terjadi: ${label}`)
    await wait(50)
  }
  console.log(`ok  ${label}`)
}

const a = client()
const b = client()
await Promise.all([a.synced, b.synced])

a.document.getMap('nodes').set('n_uji', new Y.Map([['title', 'Dari A']]))
await until(() => b.document.getMap('nodes').get('n_uji')?.get('title') === 'Dari A', 'perubahan A sampai di B')

b.document.getMap('nodes').get('n_uji').set('title', 'Diganti B')
await until(() => a.document.getMap('nodes').get('n_uji')?.get('title') === 'Diganti B', 'perubahan B sampai di A')

a.provider.destroy()
b.provider.destroy()
await wait(2500)

const c = client()
await c.synced
await until(() => c.document.getMap('nodes').get('n_uji')?.get('title') === 'Diganti B', 'tersimpan untuk klien yang datang belakangan')

const bad = new HocuspocusProvider({ url, name: 'bukan kode ruang', document: new Y.Doc() })
let badSynced = false
bad.on('synced', () => (badSynced = true))
await wait(2000)
if (badSynced) throw new Error('Nama ruang tidak sah malah tersinkron')
console.log('ok  nama ruang tidak sah ditolak')
bad.destroy()
c.provider.destroy()
process.exit(0)
