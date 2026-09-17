/**
 * The palette speaks in verbs; the room speaks in state and commands. Keeping
 * the translation here means the entry list (entries.ts) stays a plain list --
 * no context, no hooks -- and can be read, tested and extended without React.
 */

import { useMemo } from 'react'
import { KIND_LABEL } from '../../core/vocabulary'
import { useDialogs } from '../../state/dialogs/DialogProvider'
import { useAssistant } from '../../state/room/AssistantProvider'
import { useDocument } from '../../state/room/DocumentProvider'
import { useSession } from '../../state/room/SessionProvider'
import { useView } from '../../state/room/ViewProvider'
import type { PaletteRoom } from './entries'

export function usePaletteRoom(): PaletteRoom {
  const { doc, canUndo, run, insertTemplate, undo } = useDocument()
  const {
    focusId,
    panelHidden,
    sidebarHidden,
    focusMode,
    nodeOverrides,
    clearOverrides,
    togglePanel,
    toggleSidebar,
    toggleFocusMode,
  } = useView()
  const { mode, setMode, soundProfile, setSoundProfile, toggleTraversal } = useSession()
  const { startTalking } = useAssistant()
  const dialogs = useDialogs()

  return useMemo<PaletteRoom>(
    () => ({
      focusId,
      focusTitle: focusId ? doc.nodes[focusId]?.title ?? null : null,
      canUndo,
      shape: doc.room.shape,
      mode,
      soundProfile,
      panelHidden,
      sidebarHidden,
      focusMode,
      hasOverrides: Object.keys(nodeOverrides).length > 0,
      addNode: (kind) =>
        run({ type: 'createNode', parentId: focusId, kind, title: `${KIND_LABEL[kind]} baru` }, 'keyboard'),
      insertTemplate: (id) => insertTemplate(id, null),
      openDialog: (kind) => {
        if (kind === 'shape' || kind === 'share' || kind === 'help') {
          dialogs.open({ kind })
          return
        }
        if (focusId) dialogs.open({ kind, nodeId: focusId })
      },
      vote: () => focusId && run({ type: 'voteNode', id: focusId }),
      undo,
      clearOverrides,
      setShape: (shape) => run({ type: 'setRoomShape', shape }),
      setMode,
      setSoundProfile,
      togglePanel,
      toggleSidebar,
      toggleFocusMode: () => toggleFocusMode(),
      toggleTraversal,
      startTalking,
    }),
    [
      focusId,
      doc,
      canUndo,
      mode,
      soundProfile,
      panelHidden,
      sidebarHidden,
      focusMode,
      nodeOverrides,
      run,
      insertTemplate,
      undo,
      clearOverrides,
      setMode,
      setSoundProfile,
      togglePanel,
      toggleSidebar,
      toggleFocusMode,
      toggleTraversal,
      startTalking,
      dialogs,
    ],
  )
}
