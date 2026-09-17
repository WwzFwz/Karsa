/**
 * The door of a room: what a person sees before they are in.
 *
 * Short on purpose. Someone waiting needs to know three things -- which room,
 * that they are waiting, and how to stop -- and a screen reader should hear the
 * change the moment somebody answers, so the status line is a live region.
 */

import { Link } from 'react-router-dom'
import type { EntryState } from '../../state/rooms/useRoomEntry'
import { Icon } from '../shared/icons'

export function RoomDoor({
  roomId,
  state,
  onRetry,
  onGiveUp,
}: {
  roomId: string
  state: EntryState
  onRetry: () => void
  onGiveUp: () => void
}) {
  const title = 'room' in state && state.room ? state.room.title : roomId

  return (
    <div className="join">
      <main className="join-card door">
        <p className="door-code">{roomId}</p>
        <h1 className="door-title">{title}</h1>

        <p className="door-status" role="status" aria-live="polite">
          {state.status === 'memeriksa' && (
            <>
              <Icon name="dot" size={14} />
              Memeriksa ruang…
            </>
          )}
          {state.status === 'menunggu' && (
            <>
              <Icon name="lock" size={14} />
              Menunggu diterima
            </>
          )}
          {state.status === 'ditolak' && (
            <>
              <Icon name="x" size={14} />
              Permintaan masuk ditolak
            </>
          )}
          {state.status === 'tidak-ada' && (
            <>
              <Icon name="alert" size={14} />
              Kode ruang tidak ditemukan
            </>
          )}
          {state.status === 'galat' && (
            <>
              <Icon name="wifiOff" size={14} />
              {state.message}
            </>
          )}
        </p>

        <div className="door-actions">
          {state.status === 'menunggu' && (
            <Link className="btn" to="/ruang" onClick={onGiveUp}>
              Batal menunggu
            </Link>
          )}
          {state.status === 'galat' && (
            <button type="button" className="btn btn-primary" onClick={onRetry}>
              Coba lagi
            </button>
          )}
          {(state.status === 'ditolak' || state.status === 'tidak-ada' || state.status === 'galat') && (
            <Link className="btn" to="/ruang">
              Ke dasbor
            </Link>
          )}
        </div>
      </main>
    </div>
  )
}
