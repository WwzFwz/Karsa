/**
 * Whether the open room is locked or open, kept current: another member may
 * change it, and the server says so through a room signal.
 */

import { useCallback, useEffect, useState } from 'react'
import { getRoom, setRoomAccess, type RoomAccess } from '../../services/rooms/rooms'
import { useDocument } from '../room/DocumentProvider'

export function useRoomAccess(): { access: RoomAccess | null; setAccess: (access: RoomAccess) => Promise<void> } {
  const { doc, store } = useDocument()
  const roomId = doc.room.id
  const [access, setAccessState] = useState<RoomAccess | null>(null)

  const load = useCallback(() => {
    getRoom(roomId)
      .then((room) => setAccessState(room?.access ?? null))
      .catch(() => {
        // Unknown for now; the panel shows neither state rather than a wrong one.
      })
  }, [roomId])

  useEffect(load, [load])
  useEffect(() => store.signals.subscribe((signal) => signal.type === 'room' && load()), [store, load])

  const setAccess = useCallback(
    async (next: RoomAccess) => {
      await setRoomAccess(roomId, next)
      setAccessState(next)
    },
    [roomId],
  )

  return { access, setAccess }
}
