/**
 * Document sync: Hocuspocus, mounted on the same HTTP server as the room
 * service, at /sync.
 *
 * A connection is let in only with a join token for that room. What crosses
 * the network is only document changes and presence (section 7) -- this file
 * never looks inside either, except to copy a room's title and size to the
 * dashboard metadata when the document is stored.
 */

import type { IncomingMessage, Server } from 'node:http'
import type { Duplex } from 'node:stream'
import { Hocuspocus } from '@hocuspocus/server'
import { Database } from '@hocuspocus/extension-database'
import { WebSocketServer } from 'ws'
import type { Tokens } from '../auth/token.js'
import type { RoomsRepository } from '../rooms/rooms.repository.js'
import type { SeedModule } from '../rooms/seed.js'
import type { DocumentStorage } from './storage.js'

export const SYNC_PATH = '/sync'

/** Same shape as a room code, e.g. KUR-482. Anything else is refused before it touches disk. */
export const ROOM_CODE = /^[A-Z0-9]{2,8}-[A-Z0-9]{2,8}$/

export interface SyncDeps {
  storage: DocumentStorage
  rooms: RoomsRepository
  tokens: Tokens
  seed: SeedModule
}

export function createSync({ storage, rooms, tokens, seed }: SyncDeps): Hocuspocus {
  return new Hocuspocus({
    quiet: true,
    // Written at most every 2 s while people type, and at least every 10 s.
    debounce: 2000,
    maxDebounce: 10000,
    async onAuthenticate({ documentName, token }) {
      if (!ROOM_CODE.test(documentName) || !rooms.find(documentName)) {
        throw new Error(`Ruang tidak ada: ${documentName}`)
      }
      const member = tokens.verify(token, documentName)
      if (!member) throw new Error('Token tidak sah untuk ruang ini.')
      return { member }
    },
    extensions: [
      new Database({
        fetch: async ({ documentName }) => storage.load(documentName),
        store: async ({ documentName, state }) => {
          storage.save(documentName, state)
          rooms.recordDocument(documentName, seed.describeRoom(state), Date.now())
        },
      }),
    ],
  })
}

export function mountSync(httpServer: Server, hocuspocus: Hocuspocus): void {
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
}

/** Tells everyone connected to a room that something outside the document changed. */
export function signalRoom(hocuspocus: Hocuspocus, roomId: string, signal: { type: string }): void {
  hocuspocus.documents.get(roomId)?.broadcastStateless(JSON.stringify(signal))
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
