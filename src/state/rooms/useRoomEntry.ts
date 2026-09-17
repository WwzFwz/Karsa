/**
 * Getting through the door of one room: checking the code, joining an open
 * room, or waiting at a locked one until somebody inside answers.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { selfActor } from '../../services/identity'
import { checkRequest, enter, leaveStale, withdraw, type Entry } from '../../services/rooms/joining'
import { readToken } from '../../services/rooms/membership'
import type { Me } from '../../services/rooms/rooms'

/** How often the person at the door asks whether they were let in. */
const POLL_MS = 2000

export type EntryState = Entry | { status: 'memeriksa' } | { status: 'galat'; message: string }

export function meFrom(name: string): Me {
  const actor = selfActor(name)
  return { actorId: actor.id, name: actor.displayName, hue: actor.hue }
}

export function useRoomEntry(roomId: string, name: string) {
  const me = useMemo(() => meFrom(name), [name])
  /*
    The answer is kept together with the room it answers for. Moving straight
    from one room to another must not open the new one on the old room's
    "masuk" while the new check is still running.
  */
  const [answer, setAnswer] = useState<{ roomId: string; state: EntryState }>({ roomId, state: { status: 'memeriksa' } })
  const state: EntryState = answer.roomId === roomId ? answer.state : { status: 'memeriksa' }
  const setState = useCallback((next: EntryState) => setAnswer({ roomId, state: next }), [roomId])
  const [attempt, setAttempt] = useState(0)

  // The join page marks a typed code; anything else arrived by link. Read once:
  // moving between pages inside the room drops router state, and a changed
  // value here would send the person back through the door.
  const location = useLocation()
  const [via] = useState<'kode' | 'tautan'>(() =>
    (location.state as { via?: string } | null)?.via === 'kode' ? 'kode' : 'tautan',
  )

  useEffect(() => {
    let live = true
    setState({ status: 'memeriksa' })
    enter(roomId, me, via)
      .then((entry) => live && setState(entry))
      .catch((error: Error) => live && setState({ status: 'galat', message: error.message }))
    return () => {
      live = false
    }
  }, [roomId, me, via, attempt, setState])

  useEffect(() => {
    if (state.status !== 'menunggu') return
    const { requestId, room } = state
    const timer = window.setInterval(() => {
      checkRequest(roomId, requestId, me, room)
        .then((next) => {
          if (next.status !== 'menunggu') setState(next)
        })
        .catch(() => {
          // A missed poll is retried on the next tick.
        })
    }, POLL_MS)
    return () => window.clearInterval(timer)
  }, [state, roomId, me, setState])

  /** The server refused the token after all: ask again from the start. */
  const denied = useCallback(() => {
    leaveStale(roomId)
    setAttempt((n) => n + 1)
  }, [roomId])

  const giveUp = useCallback(() => {
    if (state.status === 'menunggu') void withdraw(roomId, state.requestId, me)
  }, [state, roomId, me])

  return { state, token: state.status === 'masuk' ? readToken(roomId) : null, retry: () => setAttempt((n) => n + 1), denied, giveUp }
}
