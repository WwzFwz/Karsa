/**
 * The room chrome: top bar, left navigation, the page in between, the voice
 * dock and the command palette.
 *
 * The shape follows Trido: rounded cards floating on a tinted ground, a
 * sidebar that carries words next to its icons, and a status badge. One
 * inversion is deliberate -- Trido's badge names the cloud model; ours says
 * nothing is leaving this machine.
 *
 * The primary controls live in a floating dock (VoiceDock), Zoom-style, because
 * voice must work from every view and not only from the page with the draft.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { rememberLastRoom } from '../../services/rooms/rooms'
import { useDocument } from '../../state/room/DocumentProvider'
import { useView } from '../../state/room/ViewProvider'
import { useGlobalShortcuts } from '../../state/shortcuts/useGlobalShortcuts'
import { CommandPalette } from '../commands/CommandPalette'
import { usePaletteRoom } from '../commands/usePaletteRoom'
import { Icon } from '../shared/icons'
import { VoiceDock } from '../voice/VoiceDock'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { tr } from '../../core/i18n'

export function RoomShell({ children }: { children: ReactNode }) {
  const { doc, lastError, clearError } = useDocument()
  const { panelHidden, sidebarHidden, focusMode, toggleFocusMode } = useView()
  const navigate = useNavigate()
  const { roomId } = useParams()
  const base = `/ruang/${roomId ?? doc.room.id}`

  const [paletteOpen, setPaletteOpen] = useState(false)
  const togglePalette = useCallback(() => setPaletteOpen((open) => !open), [])
  const paletteRoom = usePaletteRoom()
  useGlobalShortcuts({ base, togglePalette })

  useEffect(() => {
    rememberLastRoom(roomId ?? doc.room.id)
  }, [roomId, doc.room.id])

  /*
    The chrome offset is measured, not guessed. A hard-coded 82px was right
    until the top bar wrapped or the browser zoomed, and then the toolbar sat
    on top of it. Measuring costs one observer and cannot drift.
  */
  const appRef = useRef<HTMLDivElement>(null)
  const topbarRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const bar = topbarRef.current
    const app = appRef.current
    if (!bar || !app) return
    const sync = () => app.style.setProperty('--chrome-top', `${Math.round(bar.offsetHeight) + 24}px`)
    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(bar)
    return () => observer.disconnect()
  }, [])

  const classes = ['app', focusMode && 'is-focus-mode', panelHidden && 'is-panel-hidden', sidebarHidden && 'is-sidebar-hidden']

  return (
    <div ref={appRef} className={classes.filter(Boolean).join(' ')}>
      <a className="skip-link" href="#isi-utama">{tr('Lompat ke isi utama', 'Skip to main content')}</a>

      <TopBar barRef={topbarRef} />

      <div className="ground">
        {lastError && (
          <div className="error-bar" role="status">
            <Icon name="alert" size={16} />
            <span>{lastError}</span>
            <button type="button" className="icon-btn is-danger" aria-label={tr('Tutup pesan', 'Dismiss message')} onClick={clearError}>
              <Icon name="x" size={16} />
            </button>
          </div>
        )}
        <main id="isi-utama">{children}</main>
      </div>

      <Sidebar base={base} />

      {focusMode && (
        <button
          type="button"
          className="icon-btn focus-exit"
          aria-label={tr('Keluar dari layar penuh', 'Leave full screen')}
          title={tr('Keluar dari layar penuh (Escape)', 'Leave full screen (Escape)')}
          onClick={() => toggleFocusMode(false)}
        >
          <Icon name="minimize" size={18} />
        </button>
      )}

      <VoiceDock />

      {paletteOpen && (
        <CommandPalette room={paletteRoom} navigate={navigate} base={base} onClose={() => setPaletteOpen(false)} />
      )}
    </div>
  )
}
