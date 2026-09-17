/**
 * Rooms, joining, and the waiting room.
 *
 * Who may do what, with no accounts:
 *   - anyone may create a room, and gets a member token for it;
 *   - anyone with the code may see that a room exists, its title and access;
 *   - an open room gives a token to whoever joins;
 *   - a locked room puts them at the door, and any member may let them in (D79).
 */

import { randomInt } from 'node:crypto'
import type { Hocuspocus } from '@hocuspocus/server'
import type { Member, Tokens } from '../auth/token.js'
import { signalRoom } from '../sync/sync.js'
import type { DocumentStorage } from '../sync/storage.js'
import type { JoinRequest, JoinRequests } from './requests.js'
import type { RoomAccess, RoomSummary, RoomsRepository } from './rooms.repository.js'
import type { SeedModule } from './seed.js'

export interface Actor {
  actorId: string
  name: string
  hue: number
}

export type JoinResult =
  | { status: 'masuk'; token: string; room: RoomSummary }
  | { status: 'menunggu'; requestId: string }

/** What the person at the door is told; never someone else's token. */
export interface RequestView {
  id: string
  name: string
  hue: number
  via: JoinRequest['via']
  askedAt: number
  status: JoinRequest['status']
}

export class RoomError extends Error {
  constructor(
    readonly kind: 'tidak-ada' | 'dilarang' | 'terlalu-sering' | 'bentrok',
    message: string,
  ) {
    super(message)
  }
}

export const DEMO_ROOM = { id: 'KUR-482', title: 'Rapat Kurikulum Semester Genap' }

export class RoomsService {
  constructor(
    private readonly rooms: RoomsRepository,
    private readonly storage: DocumentStorage,
    private readonly requests: JoinRequests,
    private readonly tokens: Tokens,
    private readonly seed: SeedModule,
    private readonly hocuspocus: Hocuspocus,
    private readonly now: () => number = Date.now,
  ) {}

  /** The sample room exists on every server, open, so a first visit has something to show (D39). */
  ensureDemoRoom(): void {
    if (this.rooms.find(DEMO_ROOM.id)) return
    const creator = { id: 'a_karsa', displayName: 'Karsa', hue: 0 }
    this.storage.save(DEMO_ROOM.id, this.seed.seedRoom({ ...DEMO_ROOM, creator, demo: true }))
    this.insert(DEMO_ROOM.id, DEMO_ROOM.title, 'terbuka')
  }

  create(input: Actor & { title: string; access: RoomAccess; id?: string }): { room: RoomSummary; token: string } {
    const id = input.id && !this.rooms.find(input.id) ? input.id : this.freeCode()
    const creator = { id: input.actorId, displayName: input.name, hue: input.hue }
    // The document exists before anyone connects, so no device ever seeds it (D75).
    this.storage.save(id, this.seed.seedRoom({ id, title: input.title, creator }))
    const room = this.insert(id, input.title, input.access)
    return { room, token: this.tokens.issue(id, input.actorId, input.name) }
  }

  get(id: string): RoomSummary {
    const room = this.rooms.find(id)
    if (!room) throw new RoomError('tidak-ada', `Ruang ${id} tidak ditemukan.`)
    return room
  }

  list(ids: string[]): RoomSummary[] {
    return this.rooms.findMany(ids.slice(0, 100))
  }

  update(id: string, member: Member, patch: { title?: string; access?: RoomAccess }): RoomSummary {
    const room = this.get(id)
    this.requireMember(member, id)
    this.rooms.updateSettingsOf(id, { title: patch.title ?? room.title, access: patch.access ?? room.access }, this.now())
    signalRoom(this.hocuspocus, id, { type: 'room' })
    return this.get(id)
  }

  join(id: string, actor: Actor & { via: 'kode' | 'tautan' }, from: string): JoinResult {
    const room = this.get(id)
    if (room.access === 'terbuka') {
      return { status: 'masuk', token: this.tokens.issue(id, actor.actorId, actor.name), room }
    }
    const request = this.requests.knock(from, { roomId: id, ...actor })
    if (!request) throw new RoomError('terlalu-sering', 'Terlalu sering mengetuk. Tunggu sebentar.')
    signalRoom(this.hocuspocus, id, { type: 'requests' })
    return { status: 'menunggu', requestId: request.id }
  }

  /** Polled by the person at the door. The token is handed over only to the actor who knocked. */
  requestStatus(id: string, requestId: string, actorId: string): { status: JoinRequest['status']; token?: string; room?: RoomSummary } {
    const request = this.requests.get(id, requestId)
    if (!request || request.actorId !== actorId) throw new RoomError('tidak-ada', 'Permintaan tidak ditemukan.')
    if (request.status === 'diterima') return { status: 'diterima', token: request.token, room: this.get(id) }
    return { status: request.status }
  }

  withdraw(id: string, requestId: string, actorId: string): void {
    const request = this.requests.get(id, requestId)
    if (request?.actorId === actorId && this.requests.withdraw(id, requestId)) {
      signalRoom(this.hocuspocus, id, { type: 'requests' })
    }
  }

  listRequests(id: string, member: Member): RequestView[] {
    this.get(id)
    this.requireMember(member, id)
    return this.requests.forRoom(id).map(view)
  }

  answer(id: string, requestId: string, status: 'diterima' | 'ditolak', member: Member): RequestView {
    this.get(id)
    this.requireMember(member, id)
    const request = this.requests.get(id, requestId)
    if (!request) throw new RoomError('tidak-ada', 'Permintaan tidak ditemukan.')
    const token = status === 'diterima' ? this.tokens.issue(id, request.actorId, request.name) : undefined
    const answered = this.requests.answer(id, requestId, status, member.actorId, token)
    if (!answered) throw new RoomError('bentrok', `${request.name} sudah dijawab.`)
    signalRoom(this.hocuspocus, id, { type: 'requests' })
    return view(answered)
  }

  private requireMember(member: Member | null, id: string): asserts member is Member {
    if (!member || member.roomId !== id) throw new RoomError('dilarang', 'Hanya peserta ruang ini yang boleh melakukannya.')
  }

  private insert(id: string, title: string, access: RoomAccess): RoomSummary {
    const state = this.storage.load(id)
    const meta = state ? this.seed.describeRoom(state) : { title, shape: 'mindmap', nodeCount: 0, people: [] }
    const at = this.now()
    const room: RoomSummary = { id, access, createdAt: at, updatedAt: at, ...meta, title }
    this.rooms.insert(room)
    return room
  }

  private freeCode(): string {
    for (;;) {
      const id = `RUANG-${randomInt(100, 1000)}${randomInt(0, 10)}`
      if (!this.rooms.find(id)) return id
    }
  }
}

function view(request: JoinRequest): RequestView {
  return {
    id: request.id,
    name: request.name,
    hue: request.hue,
    via: request.via,
    askedAt: request.askedAt,
    status: request.status,
  }
}
