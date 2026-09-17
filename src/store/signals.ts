/**
 * Small notices from the server about a room, outside its document: someone
 * knocked, or the room's access changed. They carry no content -- only a
 * reason to fetch again.
 */

export type RoomSignal = { type: 'requests' } | { type: 'room' }

export class RoomSignals {
  private listeners = new Set<(signal: RoomSignal) => void>()

  subscribe = (listener: (signal: RoomSignal) => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  emit(signal: RoomSignal): void {
    this.listeners.forEach((l) => l(signal))
  }

  /** Accepts only the shapes above; anything else from the wire is ignored. */
  receive(payload: string): void {
    try {
      const parsed = JSON.parse(payload) as { type?: unknown }
      if (parsed.type === 'requests' || parsed.type === 'room') this.emit({ type: parsed.type })
    } catch {
      // Not ours.
    }
  }
}
