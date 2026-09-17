/**
 * Where a room's document lives besides memory: IndexedDB on this device,
 * other tabs of this browser, and the server when there is one.
 *
 * All three are Yjs providers on the same Y.Doc, so none of them needs to know
 * about the others -- an update from any of them reaches the rest, and applying
 * the same update twice is harmless.
 *
 * IndexedDB is what makes a reload stop erasing a meeting and lets work carry
 * on offline. The server is what makes it a meeting of more than one device,
 * and it carries presence too, through its Awareness.
 */

import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import { HocuspocusProvider } from '@hocuspocus/provider'
import { Awareness } from 'y-protocols/awareness'
import { syncUrl } from '../core/config'
import type { YjsDocStore } from './YjsDocStore'

/*
  How long to wait for the server before seeding a room nobody on this device
  has opened. Seeding too early would write a second root event into a room the
  server already has; waiting forever would leave an offline room unusable.
*/
const SERVER_WAIT_MS = 3000

/*
  Reconnecting: quickly at first, then backing off to half a minute. A server
  that is down for a while should not fill the console with an attempt a second.
*/
const RECONNECT = { delay: 1000, factor: 2, maxDelay: 30_000, minDelay: 1000, maxAttempts: 0, jitter: true }

export function connectRoom(store: YjsDocStore, roomId: string): () => void {
  const name = `karsa:ruang:${roomId}`
  const persistence = new IndexeddbPersistence(name, store.ydoc)
  const closeTabs = connectTabs(store.ydoc, name)

  const url = syncUrl()
  let server: HocuspocusProvider | null = null
  let detachPresence = () => {}
  if (url) {
    // One Awareness per connection: the provider destroys it when it closes.
    const awareness = new Awareness(store.ydoc)
    detachPresence = store.presence.attach(awareness)
    store.presence.setConnection('connecting')
    server = new HocuspocusProvider({
      url,
      name: roomId,
      document: store.ydoc,
      awareness,
      ...RECONNECT,
      onStatus: ({ status }) =>
        store.presence.setConnection(status === 'connected' ? 'connected' : 'connecting'),
    })
  }

  const serverReady = server
    ? new Promise<void>((resolve) => {
        server.on('synced', () => resolve())
        window.setTimeout(resolve, SERVER_WAIT_MS)
      })
    : Promise.resolve()

  let open = true
  void Promise.all([persistence.whenSynced, serverReady]).then(() => {
    if (open) store.markLoaded()
  })

  return () => {
    open = false
    server?.destroy()
    detachPresence()
    closeTabs()
    void persistence.destroy()
  }
}

type TabMessage =
  | { type: 'hello'; stateVector: Uint8Array }
  | { type: 'update'; update: Uint8Array }

/**
 * A new tab says what it has; the others answer with what it is missing. After
 * that, every update is passed along as it happens. Updates received from the
 * channel are not sent back into it. Works with no server at all.
 */
function connectTabs(ydoc: Y.Doc, name: string): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {}
  const channel = new BroadcastChannel(name)
  const fromTabs = {}

  const onUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin !== fromTabs) channel.postMessage({ type: 'update', update } satisfies TabMessage)
  }
  channel.onmessage = (event: MessageEvent<TabMessage>) => {
    const message = event.data
    if (message.type === 'update') {
      Y.applyUpdate(ydoc, message.update, fromTabs)
    } else {
      const update = Y.encodeStateAsUpdate(ydoc, message.stateVector)
      channel.postMessage({ type: 'update', update } satisfies TabMessage)
    }
  }
  ydoc.on('update', onUpdate)
  channel.postMessage({ type: 'hello', stateVector: Y.encodeStateVector(ydoc) } satisfies TabMessage)

  return () => {
    ydoc.off('update', onUpdate)
    channel.close()
  }
}
