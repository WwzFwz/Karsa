/**
 * One room, as five providers stacked in the order they depend on each other:
 *
 *   Document -> Presence -> View -> Session -> Assistant
 *
 * Each changes for its own reason, so a component that reads only the document
 * does not render again while someone is talking. Read them with their own
 * hooks: useDocument, usePresence, useView, useSession, useAssistant.
 */

import type { ReactNode } from 'react'
import { AssistantProvider } from './AssistantProvider'
import { DocumentProvider } from './DocumentProvider'
import { PresenceProvider } from './PresenceProvider'
import { SessionProvider } from './SessionProvider'
import { ViewProvider } from './ViewProvider'

export function RoomProvider({ selfName, children }: { selfName: string; children: ReactNode }) {
  return (
    <DocumentProvider selfName={selfName}>
      <PresenceProvider>
        <ViewProvider>
          <SessionProvider>
            <AssistantProvider>{children}</AssistantProvider>
          </SessionProvider>
        </ViewProvider>
      </PresenceProvider>
    </DocumentProvider>
  )
}
