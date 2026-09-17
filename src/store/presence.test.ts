import { after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import * as Y from 'yjs'
import { applyAwarenessUpdate, Awareness, encodeAwarenessUpdate } from 'y-protocols/awareness'
import type { Actor } from '../core/model/types'
import { RoomPresence, type PresenceChange } from './presence'

/*
  Devices in one process, each with its own Awareness, wired to each other the
  way the server would: every update one sends is applied by the others.
*/

// Awareness keeps a timer running; every one made here is closed at the end.
const opened: Awareness[] = []
const open = () => {
  const awareness = new Awareness(new Y.Doc())
  opened.push(awareness)
  return awareness
}
after(() => opened.forEach((a) => a.destroy()))

const ANI: Actor = { id: 'a_ani', displayName: 'Ani', hue: 10 }
const BAYU: Actor = { id: 'a_bayu', displayName: 'Bayu', hue: 200 }

function device(self: Actor, sendEveryMs = 0) {
  const presence = new RoomPresence(self, { sendEveryMs, settleMs: 0 })
  const awareness = open()
  const detach = presence.attach(awareness)
  presence.setConnection('connected')
  const heard: PresenceChange[] = []
  presence.subscribeChanges((changes) => heard.push(...changes))
  return { presence, awareness, detach, heard }
}

/** Connects devices like a relay: every awareness update reaches the others. */
function relay(...devices: ReturnType<typeof device>[]) {
  for (const from of devices) {
    // Existing states first, as the server does for a new connection.
    for (const to of devices) {
      if (to === from) continue
      const clients = [...from.awareness.getStates().keys()]
      applyAwarenessUpdate(to.awareness, encodeAwarenessUpdate(from.awareness, clients), 'remote')
    }
    from.awareness.on('update', ({ added, updated, removed }: Record<string, number[]>, origin: unknown) => {
      if (origin === 'remote') return
      const clients = [...added, ...updated, ...removed]
      for (const to of devices) {
        if (to !== from) applyAwarenessUpdate(to.awareness, encodeAwarenessUpdate(from.awareness, clients), 'remote')
      }
    })
  }
}

const names = (d: ReturnType<typeof device>) => d.presence.getSnapshot().participants.map((p) => p.displayName)
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('who is here', () => {
  it('alone, the list is just you', () => {
    const presence = new RoomPresence(ANI)
    assert.deepEqual(presence.getSnapshot().participants.map((p) => p.actorId), ['a_ani'])
    assert.equal(presence.getSnapshot().connection, 'offline')
  })

  it('two devices see each other, you first', () => {
    const ani = device(ANI)
    const bayu = device(BAYU)
    relay(ani, bayu)
    assert.deepEqual(names(ani), ['Ani', 'Bayu'])
    assert.deepEqual(names(bayu), ['Bayu', 'Ani'])
  })

  it('one person with two tabs is one person, talking if either tab is', () => {
    const ani = device(ANI)
    const bayuTab1 = device(BAYU)
    const bayuTab2 = device(BAYU)
    relay(ani, bayuTab1, bayuTab2)
    bayuTab2.presence.updateSelf({ talking: true })
    const people = ani.presence.getSnapshot().participants
    assert.equal(people.length, 2)
    assert.equal(people[1].talking, true)
  })

  it('talking, focus and pointing travel as ids', () => {
    const ani = device(ANI)
    const bayu = device(BAYU)
    relay(ani, bayu)
    bayu.presence.updateSelf({ talking: true, focusNodeId: 'n_akar' })
    const seen = ani.presence.getSnapshot().participants[1]
    assert.equal(seen.talking, true)
    assert.equal(seen.focusNodeId, 'n_akar')
  })
})

describe('what is worth a sound and a sentence', () => {
  it('arrival, pointing and departure of someone else', () => {
    const ani = device(ANI)
    const bayu = device(BAYU)
    relay(ani, bayu)
    bayu.presence.pointAt('n_anggaran')
    bayu.awareness.setLocalState(null)
    assert.deepEqual(
      ani.heard.map((c) => c.type),
      ['joined', 'pointed', 'left'],
    )
    assert.equal(bayu.heard.filter((c) => c.person.actorId === 'a_bayu').length, 0)
  })

  it('people already in the room are not announced as arrivals when you connect', () => {
    const bayu = device(BAYU)
    const ani = new RoomPresence(ANI, { sendEveryMs: 0, settleMs: 60_000 })
    const awareness = open()
    ani.attach(awareness)
    ani.setConnection('connected')
    const heard: PresenceChange[] = []
    ani.subscribeChanges((changes) => heard.push(...changes))
    applyAwarenessUpdate(awareness, encodeAwarenessUpdate(bayu.awareness, [bayu.awareness.clientID]), 'remote')
    assert.deepEqual(ani.getSnapshot().participants.map((p) => p.displayName), ['Ani', 'Bayu'])
    assert.equal(heard.length, 0)
  })
})

describe('the wire', () => {
  it('your own row changes at once, but sends are paced', async () => {
    const ani = device(ANI, 100)
    let sends = 0
    ani.awareness.on('change', (_: unknown, origin: unknown) => {
      if (origin === 'local') sends += 1
    })
    for (let i = 0; i < 10; i++) ani.presence.updateSelf({ focusNodeId: `n_${i}` })
    assert.equal(ani.presence.getSnapshot().participants[0].focusNodeId, 'n_9')
    await wait(150)
    assert.ok(sends <= 2, `sent ${sends} times`)
    const state = ani.awareness.getLocalState() as { focusNodeId: string }
    assert.equal(state.focusNodeId, 'n_9')
  })

  it('a closed connection leaves you on your own, marked offline', () => {
    const ani = device(ANI)
    const bayu = device(BAYU)
    relay(ani, bayu)
    ani.detach()
    const snapshot = ani.presence.getSnapshot()
    assert.equal(snapshot.connection, 'offline')
    assert.deepEqual(snapshot.participants.map((p) => p.displayName), ['Ani'])
  })
})
