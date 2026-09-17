/**
 * The room service and sync, against a real server process.
 *
 *   npm run test:server        (builds the server first)
 *
 * Starts the built server on a free port with a throwaway database, then drives
 * it the way devices do: HTTP for rooms and joining, WebSocket for the document.
 */

import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'

const dir = mkdtempSync(join(tmpdir(), 'karsa-e2e-'))
let base = ''
let ws = ''
let server

const freePort = () =>
  new Promise((resolve) => {
    const probe = createServer().listen(0, () => {
      const { port } = probe.address()
      probe.close(() => resolve(port))
    })
  })

before(async () => {
  const port = await freePort()
  base = `http://localhost:${port}/api`
  ws = `ws://localhost:${port}/sync`
  server = spawn(process.execPath, ['--experimental-sqlite', '--no-warnings', 'dist/main.js'], {
    cwd: 'server',
    env: { ...process.env, PORT: String(port), KARSA_DATA: join(dir, 'e2e.sqlite'), KARSA_SECRET: 'rahasia-uji', KARSA_STATIC: join(dir, 'none') },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  server.stderr.on('data', (d) => process.stderr.write(d))
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`${base}/health`)).ok) return
    } catch {}
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

const person = (name) => ({ actorId: `a_${name.toLowerCase()}000001`, name, hue: 120 })

async function call(method, path, body, token) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  return { status: res.status, body: text ? JSON.parse(text) : null }
}

/** Opens the document with a token; resolves to 'synced' or 'refused'. */
function connect(room, token) {
  return new Promise((resolve) => {
    const document = new Y.Doc()
    const provider = new HocuspocusProvider({ url: ws, name: room, document, token })
    const done = (result) => {
      provider.destroy()
      resolve({ result, document })
    }
    provider.on('synced', () => done('synced'))
    provider.on('authenticationFailed', () => done('refused'))
    setTimeout(() => done('timeout'), 4000)
  })
}

describe('rooms', () => {
  it('the sample room exists and is open', async () => {
    const { status, body } = await call('GET', '/rooms/KUR-482')
    assert.equal(status, 200)
    assert.equal(body.access, 'terbuka')
    assert.ok(body.nodeCount > 10)
  })

  it('creating a room seeds its document on the server and hands the creator a token', async () => {
    const { status, body } = await call('POST', '/rooms', { ...person('Ani'), title: 'Rapat uji', access: 'terkunci', id: 'UJI-101' })
    assert.equal(status, 201)
    assert.equal(body.room.id, 'UJI-101')
    const { result, document } = await connect('UJI-101', body.token)
    assert.equal(result, 'synced')
    assert.equal(document.getMap('room').get('title'), 'Rapat uji')
    assert.equal(document.getArray('events').length, 1, 'exactly one root event')
  })

  it('a code already taken is replaced, not overwritten', async () => {
    const { body } = await call('POST', '/rooms', { ...person('Bayu'), title: 'Lain', access: 'terbuka', id: 'UJI-101' })
    assert.notEqual(body.room.id, 'UJI-101')
  })

  it('refuses a request that does not validate', async () => {
    const { status } = await call('POST', '/rooms', { ...person('Ani'), title: '', access: 'bebas' })
    assert.equal(status, 400)
  })

  it('lists only the codes asked for', async () => {
    const { body } = await call('GET', '/rooms?ids=UJI-101,KUR-482,TIDAK-ADA')
    assert.deepEqual(body.map((r) => r.id).sort(), ['KUR-482', 'UJI-101'])
  })
})

describe('getting in', () => {
  it('an open room gives a token straight away', async () => {
    const { body } = await call('POST', '/rooms/KUR-482/join', { ...person('Citra'), via: 'kode' })
    assert.equal(body.status, 'masuk')
    assert.equal((await connect('KUR-482', body.token)).result, 'synced')
  })

  it('sync refuses no token, a forged one, and a token for another room', async () => {
    const open = await call('POST', '/rooms/KUR-482/join', { ...person('Citra'), via: 'kode' })
    assert.equal((await connect('UJI-101', null)).result, 'refused')
    assert.equal((await connect('UJI-101', 'palsu.token')).result, 'refused')
    assert.equal((await connect('UJI-101', open.body.token)).result, 'refused')
  })

  it('a locked room: knock, wait, be let in by a member, then connect', async () => {
    const created = await call('POST', '/rooms', { ...person('Dewi'), title: 'Terkunci', access: 'terkunci', id: 'UJI-202' })
    const knock = await call('POST', '/rooms/UJI-202/join', { ...person('Eko'), via: 'tautan' })
    assert.equal(knock.body.status, 'menunggu')

    const waiting = await call('GET', `/rooms/UJI-202/join/${knock.body.requestId}?actorId=${person('Eko').actorId}`)
    assert.equal(waiting.body.status, 'menunggu')
    assert.equal(waiting.body.token, undefined)

    const list = await call('GET', '/rooms/UJI-202/requests', null, created.body.token)
    assert.deepEqual(list.body.map((r) => r.name), ['Eko'])

    const answer = await call('POST', `/rooms/UJI-202/requests/${knock.body.requestId}`, { status: 'diterima' }, created.body.token)
    assert.equal(answer.body.status, 'diterima')

    const accepted = await call('GET', `/rooms/UJI-202/join/${knock.body.requestId}?actorId=${person('Eko').actorId}`)
    assert.equal(accepted.body.status, 'diterima')
    assert.equal((await connect('UJI-202', accepted.body.token)).result, 'synced')
  })

  it('only the person who knocked can collect the token', async () => {
    const created = await call('POST', '/rooms', { ...person('Dewi'), title: 'Terkunci 2', access: 'terkunci', id: 'UJI-303' })
    const knock = await call('POST', '/rooms/UJI-303/join', { ...person('Eko'), via: 'kode' })
    await call('POST', `/rooms/UJI-303/requests/${knock.body.requestId}`, { status: 'diterima' }, created.body.token)
    const stolen = await call('GET', `/rooms/UJI-303/join/${knock.body.requestId}?actorId=${person('Fajar').actorId}`)
    assert.equal(stolen.status, 404)
  })

  it('a declined knock gets no token', async () => {
    const created = await call('POST', '/rooms', { ...person('Dewi'), title: 'Terkunci 3', access: 'terkunci', id: 'UJI-404' })
    const knock = await call('POST', '/rooms/UJI-404/join', { ...person('Gita'), via: 'kode' })
    await call('POST', `/rooms/UJI-404/requests/${knock.body.requestId}`, { status: 'ditolak' }, created.body.token)
    const result = await call('GET', `/rooms/UJI-404/join/${knock.body.requestId}?actorId=${person('Gita').actorId}`)
    assert.equal(result.body.status, 'ditolak')
    assert.equal(result.body.token, undefined)
  })

  it('outsiders cannot answer knocks, list them, or change the room', async () => {
    const created = await call('POST', '/rooms', { ...person('Dewi'), title: 'Terkunci 4', access: 'terkunci', id: 'UJI-505' })
    const knock = await call('POST', '/rooms/UJI-505/join', { ...person('Hadi'), via: 'kode' })
    const other = await call('POST', '/rooms/KUR-482/join', { ...person('Hadi'), via: 'kode' })
    assert.equal((await call('POST', `/rooms/UJI-505/requests/${knock.body.requestId}`, { status: 'diterima' }, other.body.token)).status, 403)
    assert.equal((await call('GET', '/rooms/UJI-505/requests')).status, 403)
    assert.equal((await call('PATCH', '/rooms/UJI-505', { access: 'terbuka' }, other.body.token)).status, 403)
    assert.equal((await call('PATCH', '/rooms/UJI-505', { access: 'terbuka' }, created.body.token)).body.access, 'terbuka')
  })

  it('knocking too often is slowed down', async () => {
    const created = await call('POST', '/rooms', { ...person('Dewi'), title: 'Ramai', access: 'terkunci', id: 'UJI-606' })
    assert.ok(created.body.token)
    let limited = false
    for (let i = 0; i < 12; i++) {
      const { status } = await call('POST', '/rooms/UJI-606/join', { actorId: `a_spam${String(i).padStart(6, '0')}`, name: 'Spam', hue: 1, via: 'kode' })
      if (status === 429) limited = true
    }
    assert.ok(limited)
  })
})
