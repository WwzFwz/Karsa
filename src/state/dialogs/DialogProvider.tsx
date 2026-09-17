/**
 * Which dialog is open. State only: the dialogs themselves live in
 * components/dialogs, and DialogHost renders the open one.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { NodeId } from '../../core/model/types'

export type DialogRequest =
  | { kind: 'create'; parentId: NodeId | null; afterId?: NodeId | null }
  | { kind: 'rename'; nodeId: NodeId }
  | { kind: 'setKind'; nodeId: NodeId }
  | { kind: 'setState'; nodeId: NodeId }
  | { kind: 'note'; nodeId: NodeId }
  | { kind: 'move'; nodeId: NodeId; presetParent?: NodeId }
  | { kind: 'tool'; nodeId: NodeId }
  | { kind: 'relate'; nodeId: NodeId; presetTarget?: NodeId }
  | { kind: 'comment'; nodeId: NodeId }
  | { kind: 'delete'; nodeId: NodeId }
  | { kind: 'share' }
  | { kind: 'shape' }
  | { kind: 'help' }

interface DialogApi {
  open: (request: DialogRequest) => void
  close: () => void
  current: DialogRequest | null
}

const DialogContext = createContext<DialogApi | null>(null)

export function DialogProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<DialogRequest | null>(null)
  const api = useMemo<DialogApi>(
    () => ({ open: setCurrent, close: () => setCurrent(null), current }),
    [current],
  )
  return (
    <DialogContext.Provider value={api}>
      {children}
    </DialogContext.Provider>
  )
}

export function useDialogs(): DialogApi {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('useDialogs must be used inside DialogProvider')
  return ctx
}
