/**
 * The people at the door, as the people inside see them. Fetched when the room
 * opens and again whenever the server signals a knock or an answer.
 */

import { useCallback, useEffect, useState } from 'react'
import { answerRequest, listRequests, type JoinRequest } from '../../services/rooms/joining'
import { readToken } from '../../services/rooms/membership'
import { serverMode } from '../../services/rooms/rooms'
import { useDocument } from '../room/DocumentProvider'

export function useJoinRequests() {
  const { doc, store } = useDocument()
  const roomId = doc.room.id
  const [requests, setRequests] = useState<JoinRequest[]>([])

  const load = useCallback(() => {
    // Only members may see the door; without a token there is nothing to ask.
    if (!serverMode() || !readToken(roomId)) return
    listRequests(roomId)
      .then(setRequests)
      .catch(() => {
        // Not a member yet, or offline: nobody to show.
      })
  }, [roomId])

  useEffect(load, [load])
  useEffect(() => store.signals.subscribe((signal) => signal.type === 'requests' && load()), [store, load])

  const answer = useCallback(
    async (requestId: string, status: 'diterima' | 'ditolak'): Promise<JoinRequest | null> => {
      try {
        const done = await answerRequest(roomId, requestId, status)
        setRequests((all) => all.map((r) => (r.id === done.id ? done : r)))
        return done
      } catch {
        // Somebody else answered first; the signal brings the fresh list.
        load()
        return null
      }
    },
    [roomId, load],
  )

  return {
    waiting: requests.filter((r) => r.status === 'menunggu'),
    answered: requests.filter((r) => r.status !== 'menunggu'),
    answer,
  }
}
