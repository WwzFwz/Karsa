/**
 * Nothing of a room loads until this device is let in. With a token the room
 * opens; without one, the door (RoomDoor) handles checking, joining, and
 * waiting. Without a server, every room opens straight away.
 */

import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { RoomDoor } from '../components/rooms/RoomDoor'
import { RoomProvider } from '../state/room/RoomProvider'
import { useRoomEntry } from '../state/rooms/useRoomEntry'

export function RoomGate({ name, children }: { name: string; children: ReactNode }) {
  const roomId = useParams().roomId ?? ''
  const { state, token, retry, denied, giveUp } = useRoomEntry(roomId, name)

  if (state.status !== 'masuk') {
    return <RoomDoor roomId={roomId} state={state} onRetry={retry} onGiveUp={giveUp} />
  }

  return (
    <RoomProvider selfName={name} entry={{ token, title: state.room?.title ?? null, onDenied: denied }}>
      {children}
    </RoomProvider>
  )
}
