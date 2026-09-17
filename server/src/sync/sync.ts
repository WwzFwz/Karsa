/**
 * Document sync: Hocuspocus, mounted on the same HTTP server as the room
 * service, at /sync.
 *
 * The server holds no state of its own beyond what SQLite keeps. What crosses
 * the network is only document changes and presence (section 7) -- this file
 * never looks inside either.
 */

import type { IncomingMessage, Server } from 'node:http'
import type { Duplex } from 'node:stream'
import { Hocuspocus } from '@hocuspocus/server'
import { Database } from '@hocuspocus/extension-database'
import { WebSocketServer } from 'ws'
import type { DocumentStorage } from './storage.js'

export const SYNC_PATH = '/sync'

/** Same shape as a room code, e.g. KUR-482. Anything else is refused before it touches disk. */
const ROOM_NAME = /^[A-Z0-9]{2,8}-[A-Z0-9]{2,8}$/

export function mountSync(httpServer: Server, storage: DocumentStorage): Hocuspocus {
  const hocuspocus = new Hocuspocus({
    quiet: true,
    // Written at most every 2 s while people type, and at least every 10 s.
    debounce: 2000,
    maxDebounce: 10000,
    async onConnect({ documentName }) {
      if (!ROOM_NAME.test(documentName)) throw new Error(`Nama ruang tidak sah: ${documentName}`)
    },
    extensions: [
      new Database({
        fetch: async ({ documentName }) => storage.load(documentName),
        store: async ({ documentName, state }) => storage.save(documentName, state),
      }),
    ],
  })

  const sockets = new WebSocketServer({ noServer: true })

  httpServer.on('upgrade', (incoming: IncomingMessage, socket: Duplex, head: Buffer) => {
    const path = (incoming.url ?? '').split('?')[0]
    if (path !== SYNC_PATH) {
      socket.destroy()
      return
    }
    sockets.handleUpgrade(incoming, socket, head, (ws) => {
      const connection = hocuspocus.handleConnection(ws, toRequest(incoming))
      ws.on('message', (data: Buffer) => connection.handleMessage(new Uint8Array(data)))
      ws.on('close', (code, reason) => connection.handleClose({ code, reason: reason.toString() }))
      ws.on('error', (error) => console.error('Sambungan sinkronisasi galat:', error.message))
    })
  })

  return hocuspocus
}

/** Hocuspocus reads the request the way fetch describes it. */
function toRequest(incoming: IncomingMessage): Request {
  const headers = new Headers()
  for (const [key, value] of Object.entries(incoming.headers)) {
    if (typeof value === 'string') headers.set(key, value)
    else if (Array.isArray(value)) headers.set(key, value.join(', '))
  }
  return new Request(`http://${incoming.headers.host ?? 'localhost'}${incoming.url ?? '/'}`, { headers })
}
