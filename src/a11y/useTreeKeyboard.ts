/**
 * One keyboard behaviour, shared by the canvas and the outline.
 *
 * Both views call this hook, so neither can grow an ability the other lacks.
 * If moving a node were only possible by dragging on the canvas, a person who
 * cannot use a mouse would be locked out even though the outline is readable --
 * which is the exact failure this product exists to fix.
 */

import { useCallback } from 'react'
import { useDocument } from '../state/room/DocumentProvider'
import { usePresence } from '../state/room/PresenceProvider'
import { useView } from '../state/room/ViewProvider'
import { useDialogs } from '../state/dialogs/DialogProvider'
import type { NodeId } from '../core/model/types'
import { isTypingTarget } from './keys'

export function useTreeKeyboard() {
  const { tree, run } = useDocument()
  const { pointAt } = usePresence()
  const { visibleIds, focusId, setFocus, collapsed, toggleCollapse, setEditingId } = useView()
  const dialogs = useDialogs()

  return useCallback(
    (event: React.KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      const id: NodeId | null = focusId
      const index = id ? visibleIds.indexOf(id) : -1
      const entry = id ? tree.byId.get(id) : undefined

      const step = (delta: number) => {
        const next = visibleIds[Math.min(Math.max(index + delta, 0), visibleIds.length - 1)]
        if (next) setFocus(next)
      }

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          if (event.altKey && id) run({ type: 'reorderNode', id, direction: 'down' })
          else step(1)
          return
        case 'ArrowUp':
          event.preventDefault()
          if (event.altKey && id) run({ type: 'reorderNode', id, direction: 'up' })
          else step(-1)
          return
        case 'ArrowRight':
          event.preventDefault()
          if (!entry || !id) return
          if (entry.childIds.length === 0) return
          if (collapsed.has(id)) toggleCollapse(id, false)
          else setFocus(entry.childIds[0])
          return
        case 'ArrowLeft':
          event.preventDefault()
          if (!entry || !id) return
          if (entry.childIds.length > 0 && !collapsed.has(id)) toggleCollapse(id, true)
          else if (entry.parentId) setFocus(entry.parentId)
          return
        case 'Home':
          event.preventDefault()
          if (visibleIds[0]) setFocus(visibleIds[0])
          return
        case 'End':
          event.preventDefault()
          if (visibleIds.length) setFocus(visibleIds[visibleIds.length - 1])
          return
        case 'Enter':
          if (id) {
            // Type over the title where it sits. A dialog for one word costs two
            // extra keystrokes and hides the thing being renamed.
            event.preventDefault()
            setEditingId(id)
          }
          return
        case 'Delete':
        case 'Backspace':
          if (id) {
            event.preventDefault()
            dialogs.open({ kind: 'delete', nodeId: id })
          }
          return
        default:
          break
      }

      if (event.ctrlKey || event.metaKey || event.altKey) return

      switch (event.key) {
        case 'n':
          if (id) {
            event.preventDefault()
            dialogs.open({ kind: 'create', parentId: id })
          }
          return
        case 'N':
          if (entry) {
            event.preventDefault()
            dialogs.open({ kind: 'create', parentId: entry.parentId, afterId: id })
          }
          return
        case 't':
          if (id) {
            event.preventDefault()
            dialogs.open({ kind: 'setKind', nodeId: id })
          }
          return
        case 's':
          if (id) {
            event.preventDefault()
            dialogs.open({ kind: 'setState', nodeId: id })
          }
          return
        case 'e':
          if (id) {
            event.preventDefault()
            dialogs.open({ kind: 'note', nodeId: id })
          }
          return
        case 'm':
          if (id) {
            event.preventDefault()
            dialogs.open({ kind: 'move', nodeId: id })
          }
          return
        case 'r':
          if (id) {
            event.preventDefault()
            dialogs.open({ kind: 'relate', nodeId: id })
          }
          return
        case 'v':
          // Vote on the focused node. It only means anything under a tool, and
          // the command says so rather than the key being silently inert.
          if (id) {
            event.preventDefault()
            run({ type: 'voteNode', id })
          }
          return
        case 'l':
          if (id) {
            event.preventDefault()
            dialogs.open({ kind: 'tool', nodeId: id })
          }
          return
        case 'c':
          if (id) {
            event.preventDefault()
            dialogs.open({ kind: 'comment', nodeId: id })
          }
          return
        case 'p':
          if (id) {
            event.preventDefault()
            pointAt(id)
          }
          return
        default:
          return
      }
    },
    [visibleIds, focusId, setFocus, tree, collapsed, toggleCollapse, run, dialogs, pointAt, setEditingId],
  )
}
