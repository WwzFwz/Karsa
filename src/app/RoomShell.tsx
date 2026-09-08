/**
 * The room chrome.
 *
 * The shape follows Trido, which reads better than a flush application frame:
 * everything is a rounded card floating on a tinted ground, the sidebar carries
 * words next to its icons, and the processing mode sits in a badge in the middle
 * of the top bar where it cannot be missed.
 *
 * One inversion is deliberate. Trido's badge says which cloud model is running.
 * Ours says the opposite -- that nothing is leaving this machine. It is the same
 * piece of furniture making the opposite promise, and it is the promise this
 * product is built on.
 *
 * The primary controls live in a floating dock (see VoiceDock), Zoom-style,
 * because voice must work from every view and not only from the page that owns
 * the draft panel.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useRoom } from './RoomContext'
import { useDialogs } from './DialogContext'
import { isTypingTarget } from '../a11y/keys'
import { audioBus } from '../audio/bus'
import { Icon, type IconName } from '../ui/icons'
import { KIND_LABEL, SHAPE_LABEL } from '../ui/labels'
import { ThemeSwitch } from '../ui/ThemeSwitch'
import { VoiceDock } from '../features/voice/VoiceDock'
import { rememberLastRoom } from '../features/rooms/rooms'
import { CommandPalette } from '../features/commands/CommandPalette'
import type { PaletteRoom } from '../features/commands/entries'

/*
  Three places, not six. The room is one workspace whose arrangement and side
  panel are switched inside it; only the session summary and the settings are
  genuinely different pages. Six tabs, two of which repeated the contents of the
  others, made a person guess which copy was real.
*/
const TABS: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '..', label: 'Dasbor', icon: 'home' },
  { to: '', label: 'Ruang', icon: 'layout' },
  { to: 'ringkasan', label: 'Ringkasan', icon: 'activity' },
  { to: 'pengaturan', label: 'Pengaturan', icon: 'settings' },
]

export function RoomShell({ children }: { children: ReactNode }) {
  const room = useRoom()
  const dialogs = useDialogs()
  const navigate = useNavigate()
  const { roomId } = useParams()
  const { pathname } = useLocation()

  /*
    The chrome offset is measured, not guessed. A hard-coded 82px was right
    until the top bar wrapped or the browser zoomed, and then the toolbar sat
    on top of it. Measuring costs one observer and cannot drift.
  */
  const [paletteOpen, setPaletteOpen] = useState(false)

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

  const {
    doc,
    startTalking,
    stopTalking,
    endTalkHold,
    toggleTraversal,
    mode,
    setMode,
    soundProfile,
    setSoundProfile,
    lastError,
    clearError,
    tree,
    participants,
    selfId,
    draft,
    undo,
    applyDraft,
    discardDraft,
    panelHidden,
    togglePanel,
    sidebarHidden,
    toggleSidebar,
    focusMode,
    toggleFocusMode,
    linkingFrom,
    cancelLinking,
  } = room

  useEffect(() => {
    const base = `/ruang/${roomId ?? doc.room.id}`


    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return

      if (event.key === ' ' && !event.repeat) {
        // startTalking guards against repeats itself, so no stale state read.
        event.preventDefault()
        startTalking()
        return
      }
      // Ctrl +/-/0 belong to the canvas, not the browser, while a room is open.
      if ((event.ctrlKey || event.metaKey) && ['+', '=', '-', '0'].includes(event.key)) {
        event.preventDefault()
        window.dispatchEvent(new CustomEvent('kanvas:zoom', { detail: event.key }))
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        if (draft.status === 'ready') {
          event.preventDefault()
          applyDraft()
        }
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        // The shortcut sheet has promised this since the first commit.
        event.preventDefault()
        setPaletteOpen((open) => !open)
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        undo()
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'm') {
        event.preventDefault()
        setMode(mode === 'meeting' ? 'review' : 'meeting')
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault()
        setSoundProfile(soundProfile === 'silent' ? 'sparse' : 'silent')
        return
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return

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
          // `a` for alat. `p` was the obvious letter and is already pointing at
          // a node for everyone -- one key, one meaning.
          //
          // The rail's own button owns the sheet state, so the shortcut asks
          // for it the same way a click does rather than keeping a second copy.
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
        default:
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
    startTalking,
    stopTalking,
    endTalkHold,
    toggleTraversal,
    dialogs,
    navigate,
    roomId,
    doc.room.id,
    mode,
    setMode,
    soundProfile,
    setSoundProfile,
    togglePanel,
    toggleSidebar,
    toggleFocusMode,
    focusMode,
    undo,
    applyDraft,
    discardDraft,
    draft.status,
    linkingFrom,
    cancelLinking,
  ])

  useEffect(() => {
    audioBus.setMuted(soundProfile === 'silent')
  }, [soundProfile])

  useEffect(() => {
    rememberLastRoom(roomId ?? doc.room.id)
  }, [roomId, doc.room.id])

  const base = `/ruang/${roomId ?? doc.room.id}`

  /*
    The palette speaks in verbs; the room speaks in state and commands. Keeping
    the translation here means the entry list stays a plain list -- no context,
    no hooks -- and can be read, tested and extended without React in the way.
  */
  const paletteRoom = useMemo<PaletteRoom>(
    () => ({
      focusId: room.focusId,
      focusTitle: room.focusId ? room.doc.nodes[room.focusId]?.title ?? null : null,
      canUndo: room.canUndo,
      shape: room.doc.room.shape,
      mode: room.mode,
      soundProfile: room.soundProfile,
      panelHidden: room.panelHidden,
      sidebarHidden: room.sidebarHidden,
      focusMode: room.focusMode,
      hasOverrides: Object.keys(room.nodeOverrides).length > 0,
      addNode: (kind) =>
        room.run(
          {
            type: 'createNode',
            parentId: room.focusId,
            kind,
            title: `${KIND_LABEL[kind]} baru`,
          },
          'keyboard',
        ),
      insertTemplate: (id) => room.insertTemplate(id, null),
      openDialog: (kind) => {
        if (kind === 'shape' || kind === 'share' || kind === 'help') {
          dialogs.open({ kind })
          return
        }
        if (!room.focusId) return
        dialogs.open({ kind, nodeId: room.focusId })
      },
      vote: () => room.focusId && room.run({ type: 'voteNode', id: room.focusId }),
      undo: room.undo,
      clearOverrides: room.clearOverrides,
      setShape: (shape) => room.run({ type: 'setRoomShape', shape }),
      setMode: room.setMode,
      setSoundProfile: room.setSoundProfile,
      togglePanel: room.togglePanel,
      toggleSidebar: room.toggleSidebar,
      toggleFocusMode: () => room.toggleFocusMode(),
      toggleTraversal: room.toggleTraversal,
      startTalking: room.startTalking,
    }),
    [room, dialogs],
  )
  const online = participants.filter((p) => p.online)
  const pendingOps = draft.status === 'ready' ? draft.operations.filter((o) => o.accepted).length : 0
  const openComments = Object.values(doc.comments).filter((c) => !c.resolvedAt).length

  const badgeFor = (label: string): number => (label === 'Ruang' ? pendingOps + openComments : 0)

  return (
    <div
      ref={appRef}
      className={`app ${focusMode ? 'is-focus-mode' : ''} ${
        panelHidden ? 'is-panel-hidden' : ''
      } ${sidebarHidden ? 'is-sidebar-hidden' : ''}`}
    >
      <a className="skip-link" href="#isi-utama">
        Lompat ke isi utama
      </a>

      <header className="topbar" ref={topbarRef}>
        <button
          type="button"
          className="icon-btn"
          aria-pressed={!sidebarHidden}
          aria-label={sidebarHidden ? 'Tampilkan navigasi' : 'Sembunyikan navigasi'}
          title="Navigasi kiri ([)"
          onClick={toggleSidebar}
        >
          <Icon name="menu" size={19} />
        </button>

        <div className="topbar-brand">
          <span className="brand-mark" aria-hidden="true">
            <Icon name="target" size={18} />
          </span>
          <div className="brand-text">
            <p className="brand-name">Karsa</p>
            <p className="brand-sub">{doc.room.title}</p>
          </div>
        </div>

        <div className="topbar-spacer" />

        <div className="topbar-right">
          {/*
            The promise, as a status chip rather than a banner. It sits with the
            other status -- who is here -- because that is where people look for
            state. The full sentence is the tooltip and the settings page.
          */}
          <span className="mode-badge" title="Tidak ada audio yang keluar dari perangkat ini">
            <Icon name="shield" size={13} />
            Lokal
          </span>
          <ul className="avatar-stack" aria-label={`${online.length} peserta hadir`}>
            {online.slice(0, 5).map((p) => (
              <li
                key={p.actorId}
                className={`avatar ${p.talking ? 'is-talking' : ''}`}
                style={{ ['--hue' as string]: String(p.hue) }}
                title={`${p.displayName}${p.talking ? ' — sedang bicara' : ''}${
                  p.actorId === selfId ? ' (Anda)' : ''
                }`}
              >
                {p.displayName.charAt(0)}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn-small btn-dark"
            onClick={() => dialogs.open({ kind: 'share' })}
            title="Bagikan kode ruang"
          >
            <Icon name="share" size={15} />
            Bagikan
          </button>
          <button
            type="button"
            className="btn btn-small"
            onClick={() => dialogs.open({ kind: 'shape' })}
            title="Ganti bentuk kanvas"
          >
            <Icon name="layout" size={15} />
            <span className="hide-narrow">{SHAPE_LABEL[doc.room.shape]}</span>
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Pintasan papan ketik"
            title="Pintasan papan ketik (?)"
            onClick={() => dialogs.open({ kind: 'help' })}
          >
            <Icon name="keyboard" size={18} />
          </button>
        </div>
      </header>

      <div className="ground">
        {lastError && (
          <div className="error-bar" role="status">
            <Icon name="alert" size={16} />
            <span>{lastError}</span>
            <button
              type="button"
              className="icon-btn is-danger"
              aria-label="Tutup pesan"
              onClick={clearError}
            >
              <Icon name="x" size={16} />
            </button>
          </div>
        )}
        <main id="isi-utama">{children}</main>
      </div>

      <aside className="sidebar">
        <nav aria-label="Tampilan ruang">
          {TABS.map((tab) => {
            const badge = badgeFor(tab.label)
            return (
              <NavLink
                key={tab.label}
                to={tab.to === '..' ? '/ruang' : tab.to ? `${base}/${tab.to}` : base}
                className={({ isActive }) => {
                  // "Ruang" covers every arrangement of the workspace, so it
                  // stays lit unless one of the two real pages is open.
                  const active =
                    tab.to === '..'
                      ? false
                      : tab.to === ''
                        ? !pathname.endsWith('/ringkasan') && !pathname.endsWith('/pengaturan')
                        : isActive
                  return `nav-item ${active ? 'is-active' : ''}`
                }}
              >
                <Icon name={tab.icon} size={19} />
                <span className="nav-label">{tab.label}</span>
                {badge > 0 && <span className="nav-badge">{badge}</span>}
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar-foot">
          {/*
            A switch, drawn as one. It reads as `role="switch"` too, so a screen
            reader says "mode gelap, aktif" rather than leaving someone to guess
            what a button called "Tampilan" would do next.
          */}
          <ThemeSwitch />

          {/*
            One card, not two. "Diproses di perangkat" already sits in the top
            bar badge, and naming a single speaker here breaks the moment two
            people talk at once -- the ringed avatars up top say it better and
            say it for everyone.
          */}
          <div className="side-card">
            <p className="side-card-label">Kode ruang</p>
            <p className="side-card-value">{doc.room.id}</p>
            <p className="side-card-sub">{Object.keys(doc.nodes).length} simpul</p>
            {tree.repairs.length > 0 && (
              <p className="side-card-alert">
                <Icon name="alert" size={12} />
                {tree.repairs.length} pemulihan bentrok
              </p>
            )}
          </div>
        </div>
      </aside>

      {focusMode && (
        <button
          type="button"
          className="icon-btn focus-exit"
          aria-label="Keluar dari layar penuh"
          title="Keluar dari layar penuh (Escape)"
          onClick={() => toggleFocusMode(false)}
        >
          <Icon name="minimize" size={18} />
        </button>
      )}

      <VoiceDock />

      {paletteOpen && (
        <CommandPalette
          room={paletteRoom}
          navigate={navigate}
          base={base}
          onClose={() => setPaletteOpen(false)}
        />
      )}
    </div>
  )
}
