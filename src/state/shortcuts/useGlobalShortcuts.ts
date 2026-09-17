/**
 * Keys that work anywhere in a room, as long as nobody is typing in a field.
 *
 * The same table is shown in the `?` sheet and in docs/keyboard-map.md
 * (a11y/keys.ts). Keys that act on a focused node live in a11y/useTreeKeyboard.
 */

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { isTypingTarget } from '../../a11y/keys'
import { useDialogs } from '../dialogs/DialogProvider'
import { useAssistant } from '../room/AssistantProvider'
import { useDocument } from '../room/DocumentProvider'
import { useSession } from '../room/SessionProvider'
import { useView } from '../room/ViewProvider'

const withCtrl = (event: KeyboardEvent) => event.ctrlKey || event.metaKey

export function useGlobalShortcuts({ base, togglePalette }: { base: string; togglePalette: () => void }) {
  const { undo } = useDocument()
  const { togglePanel, toggleSidebar, focusMode, toggleFocusMode, linkingFrom, cancelLinking } = useView()
  const { toggleTraversal, mode, setMode, soundProfile, setSoundProfile } = useSession()
  const { startTalking, endTalkHold, draft, applyDraft, discardDraft } = useAssistant()
  const dialogs = useDialogs()
  const navigate = useNavigate()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return

      if (event.key === ' ' && !event.repeat) {
        // startTalking guards against repeats itself, so no stale state read.
        event.preventDefault()
        startTalking()
        return
      }
      // Ctrl +/-/0 belong to the canvas, not the browser, while a room is open.
      if (withCtrl(event) && ['+', '=', '-', '0'].includes(event.key)) {
        event.preventDefault()
        window.dispatchEvent(new CustomEvent('kanvas:zoom', { detail: event.key }))
        return
      }
      if (withCtrl(event)) {
        const key = event.key.toLowerCase()
        if (key === 'enter') {
          if (draft.status === 'ready') {
            event.preventDefault()
            applyDraft()
          }
        } else if (key === 'k') {
          event.preventDefault()
          togglePalette()
        } else if (key === 'z') {
          event.preventDefault()
          undo()
        } else if (key === 'm') {
          event.preventDefault()
          setMode(mode === 'meeting' ? 'review' : 'meeting')
        } else if (key === 'b') {
          event.preventDefault()
          setSoundProfile(soundProfile === 'silent' ? 'sparse' : 'silent')
        }
        return
      }
      if (event.altKey) return

      switch (event.key) {
        case '?':
          event.preventDefault()
          dialogs.open({ kind: 'help' })
          return
        case '\\':
        case ']':
          event.preventDefault()
          togglePanel()
          return
        case '[':
          event.preventDefault()
          toggleSidebar()
          return
        case 'f':
          event.preventDefault()
          toggleFocusMode()
          return
        case 'Escape':
          // Most-recent intent first: an unfinished link, then a draft, then
          // full screen.
          if (linkingFrom) {
            event.preventDefault()
            cancelLinking()
          } else if (draft.status === 'ready') {
            event.preventDefault()
            discardDraft()
          } else if (focusMode) {
            event.preventDefault()
            toggleFocusMode(false)
          }
          return
        case 'a':
          // `a` for alat. The rail's own button owns the sheet state, so the
          // shortcut asks for it the same way a click does.
          event.preventDefault()
          document.querySelector<HTMLButtonElement>('.tool-rail .rail-btn:last-of-type')?.click()
          return
        case '.':
          event.preventDefault()
          toggleTraversal()
          return
        case '1':
          event.preventDefault()
          navigate(base)
          return
        case '2':
          event.preventDefault()
          navigate(`${base}/outline`)
          return
        case '3':
          event.preventDefault()
          navigate(`${base}/perintah`)
          return
      }
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === ' ') {
        // Tap latches, hold ends. Same rule as the button, so nobody has to
        // keep a key pressed for the length of a sentence.
        event.preventDefault()
        endTalkHold()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [
    base,
    togglePalette,
    undo,
    togglePanel,
    toggleSidebar,
    focusMode,
    toggleFocusMode,
    linkingFrom,
    cancelLinking,
    toggleTraversal,
    mode,
    setMode,
    soundProfile,
    setSoundProfile,
    startTalking,
    endTalkHold,
    draft.status,
    applyDraft,
    discardDraft,
    dialogs,
    navigate,
  ])
}
