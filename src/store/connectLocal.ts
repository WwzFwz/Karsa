/**
 * Keeps a room on this device: in IndexedDB, and in step with other tabs of
 * the same browser.
 *
 * IndexedDB is what makes a reload stop erasing a meeting, and the first step
 * towards working offline. The tab channel is small and local on purpose; the
 * server connection is a separate provider added next to it, not a replacement.
 */

import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import type { YjsDocStore } from './YjsDocStore'

export function connectLocal(store: YjsDocStore, roomId: string): () => void {
  const name = `karsa:ruang:${roomId}`
  const persistence = new IndexeddbPersistence(name, store.ydoc)
  let open = true
  void persistence.whenSynced.then(() => {
    if (open) store.markLoaded()
  })
  const closeTabs = connectTabs(store.ydoc, name)

  return () => {
    open = false
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
 * channel are not sent back into it.
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
